# Make ForgeFit your portfolio project

Read and understand the code, customize it, and describe your actual contribution. A good project demonstration explains decisions and tradeoffs as well as the interface.

## Upload the source to GitHub

Create an empty repository named `forgefit` in your GitHub account. Do not initialize it with a README if you are pushing this existing project. In the extracted project directory, run:

```bash
git init
git add .
git status
git commit -m "Build ForgeFit full-stack training journal"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/forgefit.git
git push -u origin main
```

Replace `YOUR_USERNAME`. Check `git status` before committing: database files, exports, credentials, build outputs, and the bundled `runtime/` folder must not be staged. `.gitignore` already excludes the common local files. If an export is saved inside the repository, move it elsewhere before staging.

GitHub Actions will run Windows/Ubuntu builds with Java 17/21 and the DOM integration tests. Review the Actions results before using a “passing” claim or badge. This delivery does not create a repository or publish anything to GitHub/LinkedIn on your behalf.

## Suggested repository description

Full-stack workout journal built with Java, Spring Boot, and a responsive PWA interface. Includes secure sessions, workout planning, set logging, progress charts, and automated tests.

Topics you can use: `java`, `spring-boot`, `spring-security`, `gym`, `workout-tracker`, `full-stack`, `pwa`, `portfolio`.

## A 90-second demo

1. Use a separate demo account and add the sample data. Explain that it is fictional.
2. Show the dashboard’s workout, volume, and time summaries.
3. Open a plan, customize the exercises, and start it.
4. Log a weighted set, check it off, show the rest timer, and save the session.
5. Open the history detail and explain the volume calculation.
6. Add a weigh-in and show the progress chart and personal records.
7. Briefly show the Java service, migration files, and passing test results.
8. Show the phone layout on a real device after you have tested it.

Use your own screenshots after running it: a dashboard capture, a workout-logging capture, and a phone capture make a useful README gallery. No fabricated screenshots or native-mobile claims are needed.

## Useful talking points

- Why one Spring Boot project is easy to run from IntelliJ and distribute as a JAR.
- How CSRF protection and HTTP-only session cookies work together.
- How server-side ownership checks prevent cross-account record access.
- Why deleting a plan preserves completed sessions.
- How Flyway migrations make schema changes repeatable.
- What the automated tests cover and what still needs manual/device testing.
- Why responsive/PWA support differs from a native Android or iOS binary.

## Improvements to make it yours

Choose one useful feature and finish it end to end: custom exercises, editable past sessions, a workout calendar, a server-side draft with sync, pagination, or a CSV export. Add a meaningful test and document the behavior. A focused, understood improvement is more convincing than a list of unfinished features.
