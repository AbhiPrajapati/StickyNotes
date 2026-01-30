# Stage 1: Build the application
FROM maven:3.9.4-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy the Maven project files
COPY pom.xml .
COPY src ./src

# Build the application (skip tests for faster build)
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/stickynotes-0.0.1-SNAPSHOT.jar app.jar

# Expose port 9191
EXPOSE 9191

# Run the JAR
ENTRYPOINT ["java", "-jar", "app.jar"]
