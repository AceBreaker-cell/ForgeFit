#!/usr/bin/env sh
set -eu
cd "$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
if ! command -v java >/dev/null 2>&1; then
  echo 'Java was not found. Install a JDK 17 or 21 and add it to PATH.' >&2
  exit 1
fi
echo 'ForgeFit will be available at http://localhost:8080 after the server starts.'
echo 'Stop the app with Ctrl+C. Keep this terminal open while using ForgeFit.'
if [ -f runtime/forgefit.jar ]; then
  exec java -jar runtime/forgefit.jar
fi
exec ./mvnw spring-boot:run
