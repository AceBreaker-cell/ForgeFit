package com.forgefit;

import static com.forgefit.ApiModels.*;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final TrainingService service;
    public ApiController(TrainingService service) { this.service=service; }
    private long id(Principal principal) { return service.user(principal.getName()).id(); }
    @GetMapping("/auth/csrf") public Map<String,String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }
    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED)
    public User register(@Valid @RequestBody Registration input) { return service.register(input); }
    @GetMapping("/auth/me") public User me(Principal p) { return service.user(p.getName()); }
    @GetMapping("/data") public Map<String,Object> data(Principal p) { return service.data(p.getName()); }
    @PutMapping("/profile") public User profile(Principal p, @Valid @RequestBody Profile input) { return service.profile(p.getName(), input); }
    @PostMapping("/plans") @ResponseStatus(HttpStatus.CREATED)
    public Plan createPlan(Principal p, @Valid @RequestBody PlanInput input) { return service.savePlan(id(p), null, input); }
    @PutMapping("/plans/{planId}") public Plan updatePlan(Principal p, @PathVariable long planId, @Valid @RequestBody PlanInput input) { return service.savePlan(id(p), planId, input); }
    @DeleteMapping("/plans/{planId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlan(Principal p, @PathVariable long planId) { service.deletePlan(id(p), planId); }
    @PostMapping("/sessions") @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Long> session(Principal p, @Valid @RequestBody SessionInput input) { return Map.of("id", service.logSession(id(p), input)); }
    @DeleteMapping("/sessions/{sessionId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSession(Principal p, @PathVariable long sessionId) { service.deleteSession(id(p), sessionId); }
    @PutMapping("/weights") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void weight(Principal p, @Valid @RequestBody WeightInput input) { service.saveWeight(id(p), input); }
    @DeleteMapping("/weights/{weightId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWeight(Principal p, @PathVariable long weightId) { service.deleteWeight(id(p), weightId); }
    @PostMapping("/demo") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void demo(Principal p) { service.loadDemo(id(p)); }
}
