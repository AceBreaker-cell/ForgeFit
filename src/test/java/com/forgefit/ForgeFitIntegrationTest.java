package com.forgefit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.time.LocalDate;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:forgefit-tests;DB_CLOSE_DELAY=-1", "spring.datasource.username=sa", "spring.datasource.password="})
@AutoConfigureMockMvc
class ForgeFitIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired TrainingService service;
    private static final String ALICE="alice@example.test", BOB="bob@example.test";
    @BeforeEach void reset() {
        db.update("DELETE FROM app_user");
        service.register(new ApiModels.Registration("Alice",ALICE,"Test-password-123"));
        service.register(new ApiModels.Registration("Bob",BOB,"Other-password-456"));
    }
    private MockHttpServletRequestBuilder asAlice(MockHttpServletRequestBuilder request) { return request.with(user(ALICE)).with(csrf()); }
    private String encode(Object value) throws Exception { return json.writeValueAsString(value); }
    private Map<String,Object> plan() {
        return Map.of("name","Strength A","focus","Full body","notes","Build consistency","exercises",java.util.List.of(
            Map.of("exerciseId",1,"sets",3,"reps",8,"restSeconds",90)));
    }
    private long createPlan() throws Exception {
        String response=mvc.perform(asAlice(post("/api/plans")).contentType(MediaType.APPLICATION_JSON).content(encode(plan())))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asLong();
    }
    private Map<String,Object> session() {
        return Map.of("name","Strength A","completedOn",LocalDate.now().toString(),"durationMinutes",45,"notes","Nice session",
            "sets",java.util.List.of(Map.of("exerciseId",1,"reps",8,"weightKg",50),Map.of("exerciseId",1,"reps",6,"weightKg",52.5)));
    }

    @Test void anonymousRequestsCannotReadPrivateDataAndWritesNeedCsrf() throws Exception {
        mvc.perform(get("/api/data")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/plans").with(user(ALICE)).contentType(MediaType.APPLICATION_JSON).content(encode(plan())))
            .andExpect(status().isForbidden());
    }

    @Test void realSessionLoginRotatesTokenAndLogoutRevokesAccess() throws Exception {
        var result=mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        var session=(MockHttpSession)result.getRequest().getSession();
        JsonNode token=json.readTree(result.getResponse().getContentAsString());
        mvc.perform(post("/api/auth/login").session(session).header(token.get("headerName").asText(),token.get("token").asText())
            .param("email","  ALICE@EXAMPLE.TEST  ").param("password","Test-password-123"))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/data").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.user.email").value(ALICE))
            .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
        result=mvc.perform(get("/api/auth/csrf").session(session)).andReturn();token=json.readTree(result.getResponse().getContentAsString());
        mvc.perform(post("/api/auth/logout").session(session).header(token.get("headerName").asText(),token.get("token").asText()))
            .andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/data")).andExpect(status().isUnauthorized());
    }

    @Test void registrationValidatesAndStoresOnlyPasswordHashes() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("displayName","New User","email","New@Example.test","password","Something-long-123"))))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.email").value("new@example.test"));
        assertThat(db.queryForObject("SELECT password_hash FROM app_user WHERE email='new@example.test'",String.class)).startsWith("$2a$").doesNotContain("Something");
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("displayName","Duplicate","email","NEW@EXAMPLE.TEST","password","Something-long-123"))))
            .andExpect(status().isConflict());
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("displayName"," ","email","not-an-email","password","short"))))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("displayName","Unicode","email","unicode@example.test","password","💪".repeat(20)))))
            .andExpect(status().isBadRequest());
    }

    @Test void badPasswordDoesNotAuthenticate() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).param("email",ALICE).param("password","wrong"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Email or password is incorrect."));
    }

    @Test void workoutPlansCanBeCreatedUpdatedAndDeleted() throws Exception {
        long id=createPlan();
        var input=new java.util.HashMap<>(plan());input.put("name","Updated strength");
        input.put("exercises",java.util.List.of(Map.of("exerciseId",9,"sets",4,"reps",6,"restSeconds",120)));
        mvc.perform(asAlice(put("/api/plans/"+id)).contentType(MediaType.APPLICATION_JSON).content(encode(input)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated strength"))
            .andExpect(jsonPath("$.exercises[0].name").value("Back squat")).andExpect(jsonPath("$.exercises.length()").value(1));
        mvc.perform(asAlice(delete("/api/plans/"+id))).andExpect(status().isNoContent());
        mvc.perform(asAlice(get("/api/data"))).andExpect(jsonPath("$.plans.length()").value(0));
    }

    @Test void otherUsersCannotReadOrChangeOwnedRecords() throws Exception {
        long planId=createPlan();
        long sessionId=json.readTree(mvc.perform(asAlice(post("/api/sessions")).contentType(MediaType.APPLICATION_JSON).content(encode(session())))
            .andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(asAlice(put("/api/weights")).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("measuredOn",LocalDate.now().toString(),"weightKg",75)))).andExpect(status().isNoContent());
        long weightId=service.weights(service.user(ALICE).id()).get(0).id();
        mvc.perform(get("/api/data").with(user(BOB))).andExpect(status().isOk())
            .andExpect(jsonPath("$.plans.length()").value(0)).andExpect(jsonPath("$.sessions.length()").value(0)).andExpect(jsonPath("$.weights.length()").value(0));
        for(String path:java.util.List.of("/api/plans/"+planId,"/api/sessions/"+sessionId,"/api/weights/"+weightId))
            mvc.perform(delete(path).with(user(BOB)).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(put("/api/plans/"+planId).with(user(BOB)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(encode(plan())))
            .andExpect(status().isNotFound());
    }

    @Test void loggedVolumeIsAccurateAndDeletingPlanPreservesHistory() throws Exception {
        long planId=createPlan();
        mvc.perform(asAlice(post("/api/sessions")).contentType(MediaType.APPLICATION_JSON).content(encode(session())))
            .andExpect(status().isCreated());
        mvc.perform(asAlice(delete("/api/plans/"+planId))).andExpect(status().isNoContent());
        mvc.perform(asAlice(get("/api/data"))).andExpect(status().isOk()).andExpect(jsonPath("$.sessions.length()").value(1))
            .andExpect(jsonPath("$.sessions[0].volume").value(715.0)).andExpect(jsonPath("$.sessions[0].sets.length()").value(2));
        long sessionId=service.sessions(service.user(ALICE).id()).get(0).id();
        mvc.perform(asAlice(delete("/api/sessions/"+sessionId))).andExpect(status().isNoContent());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM session_set WHERE session_id=?",Integer.class,sessionId)).isZero();
    }

    @Test void invalidSessionsAreRejectedWithoutPartialWrites() throws Exception {
        var input=new java.util.HashMap<>(session());
        input.put("sets",java.util.List.of(Map.of("exerciseId",1,"reps",8,"weightKg",50),Map.of("exerciseId",9999,"reps",8,"weightKg",50)));
        mvc.perform(asAlice(post("/api/sessions")).contentType(MediaType.APPLICATION_JSON).content(encode(input))).andExpect(status().isBadRequest());
        assertThat(service.sessions(service.user(ALICE).id())).isEmpty();
        input.put("sets",java.util.List.of(Map.of("exerciseId",1,"reps",0,"weightKg",-5)));
        mvc.perform(asAlice(post("/api/sessions")).contentType(MediaType.APPLICATION_JSON).content(encode(input))).andExpect(status().isBadRequest());
        input=new java.util.HashMap<>(session());input.put("completedOn",LocalDate.now().plusDays(1).toString());
        mvc.perform(asAlice(post("/api/sessions")).contentType(MediaType.APPLICATION_JSON).content(encode(input))).andExpect(status().isBadRequest());
    }

    @Test void weightsUpsertByDayAndRejectImpossibleInputs() throws Exception {
        for(double kg:new double[]{75.3,75.8}) mvc.perform(asAlice(put("/api/weights")).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("measuredOn",LocalDate.now().toString(),"weightKg",kg)))).andExpect(status().isNoContent());
        mvc.perform(asAlice(get("/api/data"))).andExpect(jsonPath("$.weights.length()").value(1)).andExpect(jsonPath("$.weights[0].weightKg").value(75.8));
        mvc.perform(asAlice(put("/api/weights")).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("measuredOn",LocalDate.now().toString(),"weightKg",501)))).andExpect(status().isBadRequest());
    }

    @Test void optionalSampleDataIsIsolatedAndCannotBeAddedTwice() throws Exception {
        mvc.perform(asAlice(post("/api/demo"))).andExpect(status().isNoContent());
        mvc.perform(asAlice(get("/api/data"))).andExpect(jsonPath("$.plans.length()").value(3))
            .andExpect(jsonPath("$.sessions.length()").value(20)).andExpect(jsonPath("$.weights.length()").value(8));
        mvc.perform(asAlice(post("/api/demo"))).andExpect(status().isConflict());
        mvc.perform(get("/api/data").with(user(BOB))).andExpect(jsonPath("$.sessions.length()").value(0));
    }

    @Test void profileChangesStayWithOwner() throws Exception {
        mvc.perform(asAlice(put("/api/profile")).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("displayName","Alice Updated","weeklyGoal",3,"targetWeight",70.5))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.weeklyGoal").value(3));
        assertThat(service.user(BOB).displayName()).isEqualTo("Bob");
        mvc.perform(asAlice(put("/api/profile")).contentType(MediaType.APPLICATION_JSON)
            .content(encode(Map.of("displayName","Alice","weeklyGoal",0)))).andExpect(status().isBadRequest());
    }

    @Test void publicAppShellIsAvailableWithSecurityHeaders() throws Exception {
        mvc.perform(get("/")).andExpect(status().isOk()).andExpect(header().string("X-Content-Type-Options","nosniff"))
            .andExpect(header().exists("Content-Security-Policy"));
        mvc.perform(get("/app.js")).andExpect(status().isOk());
        mvc.perform(get("/manifest.webmanifest")).andExpect(status().isOk());
    }
}
