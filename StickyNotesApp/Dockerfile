# Use a lightweight JDK base image
FROM eclipse-temurin:17-jdk-alpine

# Set the working directory
WORKDIR /app

# Copy the built JAR file into the container
ARG JAR_FILE=target/stickynotes-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar

# Expose port 9191
EXPOSE 9191

# Run the JAR file
ENTRYPOINT ["java", "-jar", "app.jar"]
