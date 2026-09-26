FROM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /source
COPY pom.xml .
COPY src ./src
RUN mvn -B -ntp package

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN groupadd --system forgefit && useradd --system --gid forgefit forgefit && mkdir -p /app/data && chown -R forgefit:forgefit /app
COPY --from=build /source/target/forgefit.jar /app/forgefit.jar
USER forgefit
ENV SERVER_ADDRESS=0.0.0.0
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/forgefit.jar"]
