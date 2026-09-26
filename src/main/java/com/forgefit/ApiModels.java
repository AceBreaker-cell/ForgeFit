package com.forgefit;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** HTTP contracts. Database entities and password hashes never leave the server. */
public final class ApiModels {
    private ApiModels() {}
    public record Registration(@NotBlank @Size(max=60) String displayName,
        @NotBlank @Email @Size(max=254) String email,
        @NotNull @Size(min=10, max=72) String password) {}
    public record Profile(@NotBlank @Size(max=60) String displayName,
        @NotNull @Min(1) @Max(7) Integer weeklyGoal,
        @DecimalMin("20") @DecimalMax("500") BigDecimal targetWeight) {}
    public record User(long id, String displayName, String email, int weeklyGoal,
        BigDecimal targetWeight, boolean demoLoaded) {}
    public record Exercise(long id, String name, String muscle, String equipment, String description) {}
    public record PlanInput(@NotBlank @Size(max=80) String name,
        @NotBlank @Pattern(regexp="Push|Pull|Legs|Upper|Lower|Full body|Custom") String focus,
        @Size(max=1000) String notes,
        @NotNull @Size(min=1,max=20) List<@NotNull @Valid PlanExerciseInput> exercises) {}
    public record PlanExerciseInput(@NotNull @Positive Long exerciseId,
        @NotNull @Min(1) @Max(10) Integer sets,
        @NotNull @Min(1) @Max(100) Integer reps,
        @NotNull @Min(0) @Max(600) Integer restSeconds) {}
    public record PlanExercise(long exerciseId, String name, String muscle, int sets, int reps, int restSeconds) {}
    public record Plan(long id, String name, String focus, String notes, List<PlanExercise> exercises) {}
    public record SessionInput(@NotBlank @Size(max=80) String name,
        @NotNull @PastOrPresent LocalDate completedOn,
        @NotNull @Min(1) @Max(600) Integer durationMinutes,
        @Size(max=1000) String notes,
        @NotNull @Size(min=1,max=200) List<@NotNull @Valid SetInput> sets) {}
    public record SetInput(@NotNull @Positive Long exerciseId,
        @NotNull @Min(1) @Max(100) Integer reps,
        @NotNull @DecimalMin("0") @DecimalMax("1500") BigDecimal weightKg) {}
    public record LoggedSet(long exerciseId, String name, int reps, BigDecimal weightKg) {}
    public record Session(long id, String name, LocalDate completedOn, int durationMinutes,
        String notes, BigDecimal volume, List<LoggedSet> sets) {}
    public record WeightInput(@NotNull @PastOrPresent LocalDate measuredOn,
        @NotNull @DecimalMin("20") @DecimalMax("500") BigDecimal weightKg) {}
    public record Weight(long id, LocalDate measuredOn, BigDecimal weightKg) {}
}
