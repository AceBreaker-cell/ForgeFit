# Delivery verification

Verified in the delivery environment on **Linux with OpenJDK 17.0.20**.

| Check | Result |
| --- | --- |
| Java compilation and executable JAR packaging | Passed |
| Flyway schema/catalog migrations on H2 | Passed |
| Java integration tests | 12 passed, 0 failures/errors |
| Frontend DOM + actual HTTP backend tests | 5 passed, 0 failures |
| JavaScript syntax validation | Passed |
| Executable JAR file database retained after stopping and restarting | Passed |
| Shell launcher syntax, Maven XML, PWA manifest, source/JAR asset match | Passed |

The Java suite checks session login/logout, CSRF, registration validation, password hashing, cross-account isolation, plan CRUD, session volume arithmetic, plan/history independence, cascading session deletion, invalid/future inputs, same-day weight upserts, sample-data idempotency/isolation, profile ownership, and public resource security headers.

The frontend suite starts a real Java backend with an isolated in-memory H2 database. It exercises registration, sign-out, plan creation, escaped user content, set entry/completion, rest-timer state, draft resume, session saving/history, weight editing, profile editing, sample data, routes, exercise filtering, and the error for saving zero completed sets.

These frontend tests use **jsdom**, not a rendering browser. They do not verify pixel layout, native form validation, service-worker behavior, PWA installation, download behavior, or mobile touch interaction. The available remote browser could not connect to the local development server, so visual browser QA could not be completed in this environment.

The GitHub Actions matrix is provided but has not yet run in the recipient’s repository. Windows, Java 21, physical Android/iOS devices, Docker, and PostgreSQL were not executed here. A passing Linux build and OS-neutral Java implementation support portability but are not a guarantee for every environment.

No software can be guaranteed free of all defects. Re-run the included tests after modifications, and use the manual smoke test below before publishing a demo.

## Manual smoke test

1. Import `pom.xml` in IntelliJ with JDK 17 or 21; run the application.
2. Create a disposable account. Try one wrong password, then sign in correctly.
3. Create a plan with two exercises; edit and duplicate it.
4. Start a workout, enter a weight and reps, check a set, and observe the rest timer.
5. Refresh once, resume the draft, and save. Confirm the details and volume in Activity.
6. Restart the Java application and sign back in. Confirm the session remains.
7. Add a weight entry, edit it for the same date, and verify there is only one entry.
8. Create a second account and verify the first account’s records are absent.
9. Try phone widths and a real phone on a trusted network; check menus, dialogs, and horizontal scrolling.
10. For an HTTPS deployment, test home-screen installation, offline messaging, and reconnect behavior.
