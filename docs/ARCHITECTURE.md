# Architecture and design decisions

ForgeFit is a single deployable Java application. Spring serves both the static frontend and the `/api` endpoints from the same origin. This avoids CORS configuration, a frontend development server, and browser storage of bearer tokens.

## Request flow

1. The page requests `/api/auth/csrf` and receives a masked CSRF token tied to a session.
2. Registration validates the input, normalizes email, and stores a BCrypt hash.
3. Spring Security processes the form-encoded login and handles session fixation protection. The client fetches a fresh CSRF token after login.
4. Authenticated requests resolve the account from the server’s principal. Clients cannot select a different owner ID.
5. Controllers validate input. `TrainingService` checks ownership and uses parameterized SQL.
6. Multi-table writes use database transactions. Flyway owns schema changes.
7. The browser derives charts and summaries from that account’s saved records.

## Data relationships

| Parent | Child | Relationship |
| --- | --- | --- |
| `app_user` | `workout_plan` | One account owns many plans |
| `workout_plan` | `plan_exercise` | An ordered list of planned movements |
| `exercise` | `plan_exercise` | Catalog reference |
| `app_user` | `training_session` | One account owns many completed sessions |
| `training_session` | `session_set` | An ordered list of completed sets |
| `exercise` | `session_set` | Catalog reference |
| `app_user` | `weight_entry` | At most one weight per calendar day |

Completed sessions store the session name independently of plans. Deleting or editing a plan therefore preserves history. Deleting a session cascades to its sets. Duplicate weight dates are updated transactionally; locking the owning user row serializes concurrent same-user writes on H2 and PostgreSQL.

## Security choices

- Cookie-based Spring Security sessions, BCrypt cost 12, HTTP-only cookies, SameSite=Lax.
- CSRF protection remains on for registration, login, logout, and all other writes.
- A per-process, IP-based attempt limiter bounds authentication requests to 30 per 10 minutes. A trusted edge limiter is needed when sharing an internet deployment.
- Email and all dynamic browser text are escaped; user content is not rendered as executable HTML.
- Content Security Policy restricts scripts and styles to this origin; frames are denied.
- No user-controlled SQL fragments. Internal table names are fixed constants; values are bound parameters.
- API responses are never stored in the service-worker cache. Passwords never leave the database layer.

## Tradeoffs worth discussing in an interview

Spring JDBC makes ownership and transactions visible and easy to explain. A larger domain could use repositories and JPA, but neither is necessary to ship this focused application.

The frontend is plain JavaScript with a small state object and hash routes. It has no compile pipeline. Larger teams may prefer TypeScript and a component framework. `app.js` and the styles can be split into modules as the UI grows.

`GET /api/data` returns the account’s complete history. That keeps a personal journal simple but is not intended for millions of rows. Pagination, aggregate endpoints, and batched child queries are useful next steps at larger scale; the current read paths perform per-plan/per-session queries.

An unfinished workout lives only in that tab’s session storage. This preserves it through refresh without treating incomplete sets as completed history. Cross-device drafts would require a server-side draft table and conflict handling.

The PWA caches only public shell assets. It intentionally does not claim offline training writes. Offline sync would require an explicit write queue, idempotency keys, user-visible sync state, and conflict resolution. Repeated manual/API session submissions are not currently deduplicated; the UI disables Save while a request is pending.

Weights use decimal database columns. Summary arithmetic uses `BigDecimal` for saved-session volume, then JavaScript numbers for display and charts. Dates are calendar dates without timezone conversion; backend future-date validation follows the server timezone. For globally distributed users, add an explicit per-user timezone policy.
