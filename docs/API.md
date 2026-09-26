# HTTP API

Base URL for local development: `http://localhost:8080/api`.

All data belongs to the authenticated account. There is no `userId` request field. Obtain a CSRF token and retain the session cookie before sending writes. After login, fetch a new token.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/auth/csrf` | Public: returns `{headerName, token}` |
| POST | `/auth/register` | Public, CSRF required: `{displayName,email,password}`; 201 |
| POST | `/auth/login` | Public, CSRF required: form-encoded `email`, `password`; 204 |
| POST | `/auth/logout` | CSRF required; destroys the session; 204 |
| GET | `/auth/me` | Current public profile |
| GET | `/data` | Profile, plans, sessions, weights, exercise catalog |
| PUT | `/profile` | `{displayName,weeklyGoal,targetWeight}`; target can be null |
| POST | `/plans` | Create a plan; 201 |
| PUT | `/plans/{id}` | Replace a plan’s details and movements |
| DELETE | `/plans/{id}` | Delete own plan; preserve session history; 204 |
| POST | `/sessions` | Save a completed session; 201, returns ID |
| DELETE | `/sessions/{id}` | Delete own session and sets; 204 |
| PUT | `/weights` | `{measuredOn,weightKg}`; upsert same account/date; 204 |
| DELETE | `/weights/{id}` | Delete own weigh-in; 204 |
| POST | `/demo` | Load account-local sample records once; 204 |

Plan request:

```json
{
  "name": "Push day",
  "focus": "Push",
  "notes": "My own training plan",
  "exercises": [
    { "exerciseId": 1, "sets": 3, "reps": 8, "restSeconds": 90 }
  ]
}
```

Session request (replace the sample date with today or a past date):

```json
{
  "name": "Push day",
  "completedOn": "2026-01-01",
  "durationMinutes": 45,
  "notes": "Felt focused",
  "sets": [
    { "exerciseId": 1, "reps": 8, "weightKg": 60 },
    { "exerciseId": 1, "reps": 7, "weightKg": 60 }
  ]
}
```

The recorded volume is 900 kg. Each array item represents one completed set. There are no placeholder or unchecked sets in the persisted session.

## Validation and errors

| Input | Limit |
| --- | --- |
| Name | 60 characters for profiles; 80 for plans/sessions |
| Password | 10–72 characters; at most 72 UTF-8 bytes for BCrypt |
| Notes | Up to 1,000 characters |
| Plan movements | 1–20; 1–10 sets each; 1–100 reps; 0–600 seconds rest |
| Completed session | 1–200 sets; 1–600 minutes |
| Set | 1–100 reps; 0–1,500 kg external load |
| Body weight / target | 20–500 kg |
| Date | Required ISO date, today or earlier in the server timezone |
| Weekly goal | 1–7 |

Numbers are input bounds, not exercise recommendations. No nutrition, medical, or automated training prescription is provided.

Errors are JSON with a `message` and, for field-validation failures, an `errors` list. Typical statuses: 400 for invalid input, 401 for unauthenticated requests, 403 for missing/expired CSRF, 404 for a missing or unowned record, 409 for duplicate email or repeated demo import, and 429 for too many authentication requests.
