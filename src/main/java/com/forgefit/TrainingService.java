package com.forgefit;

import static com.forgefit.ApiModels.*;
import static org.springframework.http.HttpStatus.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TrainingService {
    private final JdbcTemplate db;
    private final PasswordEncoder passwords;
    public TrainingService(JdbcTemplate db, PasswordEncoder passwords) { this.db = db; this.passwords = passwords; }

    public User user(String email) {
        return db.query("SELECT * FROM app_user WHERE email = ?", (r, n) -> new User(r.getLong("id"),
            r.getString("display_name"), r.getString("email"), r.getInt("weekly_goal"), r.getBigDecimal("target_weight"),
            r.getBoolean("demo_loaded")), email).stream().findFirst().orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED));
    }
    @Transactional
    public User register(Registration input) {
        String email = input.email().trim().toLowerCase(Locale.ROOT);
        if (input.password().getBytes(StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(BAD_REQUEST, "Password must be at most 72 UTF-8 bytes.");
        if (db.queryForObject("SELECT COUNT(*) FROM app_user WHERE email = ?", Integer.class, email) > 0)
            throw new ResponseStatusException(CONFLICT, "An account with this email already exists.");
        insert("INSERT INTO app_user(email, password_hash, display_name) VALUES (?, ?, ?)", email,
            passwords.encode(input.password()), input.displayName().trim());
        return user(email);
    }
    public User profile(String email, Profile input) {
        db.update("UPDATE app_user SET display_name=?, weekly_goal=?, target_weight=? WHERE email=?",
            input.displayName().trim(), input.weeklyGoal(), input.targetWeight(), email);
        return user(email);
    }
    public List<Exercise> exercises() {
        return db.query("SELECT * FROM exercise ORDER BY name", (r, n) -> new Exercise(r.getLong("id"),
            r.getString("name"), r.getString("muscle"), r.getString("equipment"), r.getString("description")));
    }
    public List<Plan> plans(long userId) {
        return db.query("SELECT * FROM workout_plan WHERE user_id=? ORDER BY id DESC", (r, n) -> {
            long id = r.getLong("id");
            return new Plan(id, r.getString("name"), r.getString("focus"), r.getString("notes"),
                db.query("SELECT pe.*, e.name, e.muscle FROM plan_exercise pe JOIN exercise e ON e.id=pe.exercise_id WHERE plan_id=? ORDER BY position",
                    (x, i) -> new PlanExercise(x.getLong("exercise_id"), x.getString("name"), x.getString("muscle"),
                        x.getInt("sets"), x.getInt("reps"), x.getInt("rest_seconds")), id));
        }, userId);
    }
    @Transactional
    public Plan savePlan(long userId, Long id, PlanInput input) {
        for (var e : input.exercises()) requireExercise(e.exerciseId());
        if (id == null) id = insert("INSERT INTO workout_plan(user_id,name,focus,notes) VALUES (?,?,?,?)", userId, input.name().trim(), input.focus(), safe(input.notes()));
        else {
            requireOwned("workout_plan", id, userId);
            db.update("UPDATE workout_plan SET name=?,focus=?,notes=? WHERE id=? AND user_id=?", input.name().trim(), input.focus(), safe(input.notes()), id, userId);
            db.update("DELETE FROM plan_exercise WHERE plan_id=?", id);
        }
        int position=0;
        for (var e : input.exercises()) db.update("INSERT INTO plan_exercise(plan_id,exercise_id,sets,reps,rest_seconds,position) VALUES (?,?,?,?,?,?)",
            id, e.exerciseId(), e.sets(), e.reps(), e.restSeconds(), position++);
        long selected = id;
        return plans(userId).stream().filter(p -> p.id() == selected).findFirst().orElseThrow();
    }
    @Transactional
    public void deletePlan(long userId, long id) {
        requireOwned("workout_plan", id, userId);
        db.update("DELETE FROM workout_plan WHERE id=? AND user_id=?", id, userId);
    }
    public List<Session> sessions(long userId) {
        return db.query("SELECT * FROM training_session WHERE user_id=? ORDER BY completed_on DESC, id DESC", (r, n) -> {
            long id = r.getLong("id");
            List<LoggedSet> sets = db.query("SELECT s.*, e.name FROM session_set s JOIN exercise e ON e.id=s.exercise_id WHERE session_id=? ORDER BY position",
                (x, i) -> new LoggedSet(x.getLong("exercise_id"), x.getString("name"), x.getInt("reps"), x.getBigDecimal("weight_kg")), id);
            BigDecimal volume = sets.stream().map(s -> s.weightKg().multiply(BigDecimal.valueOf(s.reps()))).reduce(BigDecimal.ZERO, BigDecimal::add);
            return new Session(id, r.getString("name"), r.getDate("completed_on").toLocalDate(), r.getInt("duration_minutes"), r.getString("notes"), volume, sets);
        }, userId);
    }
    @Transactional
    public long logSession(long userId, SessionInput input) {
        for (var set : input.sets()) requireExercise(set.exerciseId());
        long id = insert("INSERT INTO training_session(user_id,name,completed_on,duration_minutes,notes) VALUES (?,?,?,?,?)",
            userId, input.name().trim(), input.completedOn(), input.durationMinutes(), safe(input.notes()));
        int position=0;
        for (var set : input.sets()) db.update("INSERT INTO session_set(session_id,exercise_id,reps,weight_kg,position) VALUES (?,?,?,?,?)",
            id, set.exerciseId(), set.reps(), set.weightKg(), position++);
        return id;
    }
    @Transactional
    public void deleteSession(long userId, long id) {
        requireOwned("training_session", id, userId);
        db.update("DELETE FROM training_session WHERE id=? AND user_id=?", id, userId);
    }
    public List<Weight> weights(long userId) {
        return db.query("SELECT * FROM weight_entry WHERE user_id=? ORDER BY measured_on", (r, n) -> new Weight(r.getLong("id"),
            r.getDate("measured_on").toLocalDate(), r.getBigDecimal("weight_kg")), userId);
    }
    @Transactional
    public void saveWeight(long userId, WeightInput input) {
        // The profile row serializes same-user upserts on both H2 and PostgreSQL.
        db.queryForObject("SELECT id FROM app_user WHERE id=? FOR UPDATE", Long.class, userId);
        int changed = db.update("UPDATE weight_entry SET weight_kg=? WHERE user_id=? AND measured_on=?", input.weightKg(), userId, input.measuredOn());
        if (changed == 0) db.update("INSERT INTO weight_entry(user_id,measured_on,weight_kg) VALUES (?,?,?)", userId, input.measuredOn(), input.weightKg());
    }
    @Transactional
    public void deleteWeight(long userId, long id) {
        requireOwned("weight_entry", id, userId);
        db.update("DELETE FROM weight_entry WHERE id=? AND user_id=?", id, userId);
    }
    /** Explicit opt-in sample data, isolated per account and guarded against repeated imports. */
    @Transactional
    public void loadDemo(long userId) {
        boolean loaded = Boolean.TRUE.equals(db.queryForObject("SELECT demo_loaded FROM app_user WHERE id=? FOR UPDATE", Boolean.class, userId));
        if (loaded) throw new ResponseStatusException(CONFLICT, "Sample data has already been added to this account.");
        var push = new PlanInput("Push · strength", "Push", "Sample plan — edit it to fit your training.", List.of(
            new PlanExerciseInput(1L, 3, 8, 90), new PlanExerciseInput(15L, 3, 8, 90), new PlanExerciseInput(16L, 3, 12, 60), new PlanExerciseInput(19L, 3, 12, 60)));
        var pull = new PlanInput("Pull · build", "Pull", "Sample plan — edit it to fit your training.", List.of(
            new PlanExerciseInput(5L, 3, 10, 90), new PlanExerciseInput(6L, 3, 8, 90), new PlanExerciseInput(17L, 3, 12, 60), new PlanExerciseInput(18L, 3, 12, 60)));
        var legs = new PlanInput("Legs · foundation", "Legs", "Sample plan — edit it to fit your training.", List.of(
            new PlanExerciseInput(9L, 3, 8, 120), new PlanExerciseInput(10L, 3, 10, 90), new PlanExerciseInput(12L, 3, 12, 60), new PlanExerciseInput(14L, 3, 15, 60)));
        var templates = List.of(push, pull, legs);
        templates.forEach(p -> savePlan(userId, null, p));
        LocalDate today = LocalDate.now();
        for (int i=0; i<20; i++) {
            var template=templates.get(i % 3); var sets=new ArrayList<SetInput>();
            for (var e:template.exercises()) for (int s=0; s<e.sets(); s++)
                sets.add(new SetInput(e.exerciseId(), e.reps(), BigDecimal.valueOf(20 + (e.exerciseId() % 4)*10 + (i/5)*2.5)));
            logSession(userId, new SessionInput(template.name(), today.minusDays(46L-i*2L), 42+i%6*3, "Sample session", sets));
        }
        for (int i=0; i<8; i++) saveWeight(userId, new WeightInput(today.minusDays(49L-i*7L), BigDecimal.valueOf(78.4-i*0.35)));
        db.update("UPDATE app_user SET demo_loaded=TRUE WHERE id=?", userId);
    }
    public Map<String,Object> data(String email) {
        User u=user(email);
        return Map.of("user", u, "plans", plans(u.id()), "sessions", sessions(u.id()), "weights", weights(u.id()), "exercises", exercises());
    }
    private void requireOwned(String table, long id, long userId) {
        // Table names are internal constants, never request values.
        if (db.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE id=? AND user_id=?", Integer.class, id, userId) == 0)
            throw new ResponseStatusException(NOT_FOUND, "Record not found.");
    }
    private void requireExercise(long id) {
        if (db.queryForObject("SELECT COUNT(*) FROM exercise WHERE id=?", Integer.class, id) == 0)
            throw new ResponseStatusException(BAD_REQUEST, "Unknown exercise.");
    }
    private String safe(String value) { return value == null ? "" : value.trim(); }
    private long insert(String sql, Object... args) {
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql, new String[]{"id"});
            for (int i=0; i<args.length; i++) statement.setObject(i+1, args[i]);
            return statement;
        }, key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
}
