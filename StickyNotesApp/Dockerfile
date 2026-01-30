# Stage 1: Build the Spring Boot app
FROM maven:3.9.4-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy only the app folder (StickyNotesApp) into the container
COPY StickyNotesApp/pom.xml .
COPY StickyNotesApp/src ./src

# Build the app (skip tests for faster build)
RUN mvn clean package -DskipTests

# Stage 2: Run the app
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/stickynotes-0.0.1-SNAPSHOT.jar app.jar

# Expose port 9191
EXPOSE 9191

# Run the JAR
ENTRYPOINT ["java", "-jar", "app.jar"]
