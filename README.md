# ForgeFit

<img width="1920" height="927" alt="image" src="https://github.com/user-attachments/assets/18546506-cdbd-41da-97bc-b523adf6c419" />


**Your training, in focus.** A full-stack gym journal built with Java and Spring Boot: plan your workouts, log every set, and see your progress in a responsive dashboard.

This is a personal training application and portfolio project. It is not gym billing or membership-management software. And also you can use this as a template if you wanted to use it as your gym application, just don't forget the credit me in your apps 😉

## What you can do

- Create an account and sign in securely with a session cookie.
- Create, edit, duplicate, and delete workout plans using a searchable 24-exercise catalog.
- Start a workout, enter weights and repetitions, check off completed sets, and use a rest timer.
- Resume an unfinished workout in the same browser tab, including after refreshing.
- Review session details and delete incorrect sessions.
- View weekly workout charts, total lifted volume, training time, and an active-week streak.
- Log and edit daily body weight, see its trend, and track personal records.
- Set a weekly workout goal and an optional target weight.
- Export your account data as JSON.
- Add optional, clearly labeled sample records for a portfolio demonstration.
- Use a phone-sized layout; install to the home screen when served over HTTPS.

<img width="1920" height="929" alt="image" src="https://github.com/user-attachments/assets/540dcf85-dec0-46ce-8ac8-f78f780c508c" />


All weights are in kilograms. Workout volume is **the sum of external weight × completed repetitions**. Only checked sets are saved. The exercise catalog explains the load convention for each movement. Personal records are the heaviest set per exercise; reps break ties. The active-week streak counts consecutive Monday–Sunday weeks with at least one session; an unfinished current week does not break a streak from last week.

## Quick start on Windows / IntelliJ IDEA

1. Extract the ZIP. Install a **JDK 17 or JDK 21** if you do not already have one.
2. In IntelliJ IDEA, choose **Open**, then select the `forgefit` folder or its `pom.xml`. Open it as a Maven project and allow dependencies to download.
3. Set **Project SDK** and the **Maven runner JRE** to your installed JDK. Java 17 is the source language level; Java 21 can build it too.
4. Open `src/main/java/com/forgefit/ForgeFitApplication.java` and run its `main` method with the green arrow. A dedicated Spring IDE plugin is not required.
5. Wait for `Started ForgeFitApplication` in the run console, then visit **http://localhost:8080**.
6. Select **Create account**. There is no default password or pre-created administrator.

Keep IntelliJ’s run process alive while using the application. Set the run configuration’s **working directory to the project root**, so IntelliJ and terminal runs use the same `data/` directory.

The downloadable bundle also includes `runtime/forgefit.jar`. To try that already-built version, double-click `run-windows.cmd`. After editing source code, run it from IntelliJ or Maven; the bundled JAR does not rebuild itself. You can replace it with `target/forgefit.jar` after building.

### Windows terminal (PowerShell)

```powershell
java -version
.\mvnw.cmd spring-boot:run
```

### Linux / macOS terminal

```bash
chmod +x mvnw run-linux.sh
./mvnw spring-boot:run
```

`./run-linux.sh` runs the bundled JAR when it is present. The Maven Wrapper downloads Maven on the first build, so a separate Maven installation is not required. The first source build needs internet access. The bundled JAR needs only Java and works locally without downloading dependencies.

### Build and run a JAR

```powershell
# Windows
.\mvnw.cmd clean verify
java -jar target\forgefit.jar
```

```bash
# Linux / macOS
./mvnw clean verify
java -jar target/forgefit.jar
```

Do not run both commands at the same time on port 8080. To use another port:

```bash
java -jar target/forgefit.jar --server.port=8081
```

## Stack

| Layer | Implementation |
| --- | --- |
| Backend | Java 17 language level, Spring Boot 3.5.16 |
| HTTP API | Spring MVC, Jakarta Bean Validation |
| Authentication | Spring Security, BCrypt, cookie sessions, CSRF |
| Persistence | Spring JDBC, H2 file database, Flyway migrations |
| Optional database | PostgreSQL JDBC driver and production profile |
| Frontend | Plain JavaScript, HTML, CSS, original SVG charts and icons |
| Mobile | Responsive web app, web manifest, public-shell service worker |
| Testing | JUnit 5 + MockMvc; optional Node/jsdom HTTP interaction tests |
| Build | Maven Wrapper; one executable JAR |

There is no separate frontend build or Node requirement for running the app.

## Data and privacy

- Your local database is `data/forgefit.mv.db`, relative to the working directory. It persists after restarting the app.
- Each account owns its own records. Ownership checks are enforced by the server, not just hidden in the UI.
- Passwords are hashed with BCrypt. They are never returned by the API or data export.
- Mutating API requests require a CSRF token. Session cookies are HTTP-only and use SameSite=Lax.
- The app binds to `127.0.0.1` by default. It does not make itself public.
- Offline API data is not cached. An unfinished workout is a temporary `sessionStorage` draft in the same tab, cleared on explicit logout or when that tab is closed. A different tab or device does not share the draft.
- Exports are JSON snapshots, **not an import/restore format in this version**. To back up the entire database, stop the app and copy its `data/` directory. Restore only while the app is stopped.
- Data is not encrypted at rest by this application. Keep the database and exports out of public repositories.
- There is no email verification, password-reset email, or account-deletion UI in this version.

For a populated demo, create a separate demo account and choose **Add sample data**. Sample sessions have sample notes and become part of that account’s statistics. The import can run once per account. It replaces a weight entry when a sample date already exists; the confirmation explains this. Your normal personal account can stay empty until you log real sessions.

## Android and iOS

The mobile version is a **responsive web app/PWA**, not a native APK or IPA. On a phone, you connect to the Java server running on your PC or on a deployed host. See [the mobile guide](docs/MOBILE.md) for same-Wi-Fi setup, home-screen installation, and HTTPS requirements.

The app needs the server to read or save training data. The service worker provides public assets and an offline page; it does not queue offline writes. Windows/Linux run the Java server. Android/iOS run the web interface.

## Tests and compatibility

Run the Java integration suite with `./mvnw verify` or `.\mvnw.cmd verify`.

Optional frontend interaction tests require Node 20+ and an already-built `target/forgefit.jar`:

```bash
npm ci --ignore-scripts
npm test
```

The frontend tests start an isolated, in-memory Java server, create disposable accounts, and exercise the actual HTTP API using jsdom. They cover frontend behavior but do not measure layout or native browser behavior. See [verification details](docs/VERIFICATION.md).

GitHub Actions is configured to build and test on **Windows and Ubuntu with Java 17 and 21**. That matrix runs after you upload the repository; it has not been run in your GitHub account yet. This delivery was verified on Linux / Java 17. Windows, physical phones, and PostgreSQL require their own final checks.

## Project layout

```text
src/main/java/com/forgefit/
  ForgeFitApplication.java       Application entry point
  SecurityConfig.java            Session authentication, CSRF, HTTP headers
  AuthRateLimitFilter.java       Bounded, per-process sign-in attempt limiter
  ApiController.java             HTTP routes
  ApiModels.java                 Validated request/response records
  TrainingService.java           Database operations and ownership checks
  ApiExceptionHandler.java       JSON errors
src/main/resources/
  application.properties        Local defaults and environment settings
  application-production.properties
  db/migration/                  Versioned schema and exercise catalog
  static/                        Browser app, PWA manifest, icons
src/test/                        Java integration tests
web-test/                        Optional frontend/HTTP interaction tests
docs/                            Architecture, API, mobile, portfolio guides
```

## Put it on GitHub

See [the portfolio guide](docs/PORTFOLIO.md) for exact commands, a short demo walkthrough, and talking points. The project includes `.gitignore`, an MIT license, and a Windows/Linux CI workflow.

Do not commit `data/`, `runtime/`, `target/`, `node_modules/`, exports, or credentials. The bundled binary is for trying the download; source code belongs in Git. Use a GitHub Release if you want to distribute the JAR later.

## Optional Docker

```bash
docker compose up --build
```

Open http://localhost:8080. The named `forgefit-data` volume retains the database between container restarts. `docker compose down` retains it; adding `-v` deletes the data. Docker is optional and was not executed in the delivery environment.

## Optional PostgreSQL / public hosting

Use an existing PostgreSQL database, set `SPRING_PROFILES_ACTIVE=production`, `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`, and place the app behind HTTPS. Flyway creates the tables. The production profile enables secure cookies; **plain HTTP login will not work with that profile**.

Example JDBC URL: `jdbc:postgresql://localhost:5432/forgefit`. Use your database provider’s TLS requirements, preferably certificate-verified TLS for a remote server. Do not paste secrets into committed configuration files. Environment variables are read by Spring; `.env` files are not loaded automatically by Java.

Switching database URLs does **not** transfer existing H2 data. The application uses in-memory login sessions, so restart requires signing in again, and multi-instance deployment needs shared sessions or sticky routing. For an internet-facing deployment, configure trusted reverse-proxy forwarding and edge rate limits, review current dependency security advisories, and add password recovery/email verification as needed. This is a portfolio baseline, not a production certification.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `java` is not recognized | Install a JDK; set `JAVA_HOME` to its folder and add its `bin` folder to PATH. Restart the terminal. |
| IntelliJ imports but will not compile | Reload Maven; check Project SDK and Maven runner JRE are 17 or 21. |
| `JAVA_HOME` is invalid | Point it to the JDK root, not its `bin` directory or a `java.exe` file. |
| Maven cannot download dependencies | Check internet access and any proxy/firewall settings. IntelliJ supports Maven proxy configuration. |
| `Port 8080 already in use` | Stop the earlier run, or use `--server.port=8081`. |
| Database is locked | Stop the other ForgeFit process using the same database directory. |
| My records disappeared | Check the working directory/DB_URL; different directories create different local databases. |
| 403 after leaving a page open | Refresh the page to get a new session-bound CSRF token, then sign in if needed. |
| Phone cannot connect | Check the server bind address, same Wi-Fi, PC firewall, and the PC’s IPv4 address. |
| Old interface after changing files | Rebuild the JAR and restart. The bundled `runtime/` JAR is a snapshot; Maven/IntelliJ runs the source. |

## References

- [Spring Boot 3.5 system requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html)
- [Spring Security CSRF protection](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)
- [MDN: making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Apache Maven Wrapper](https://maven.apache.org/wrapper/)

MIT licensed. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
