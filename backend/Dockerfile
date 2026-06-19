# Etapa 1: Construcción
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Descargar dependencias (optimización de caché de capas de Docker)
RUN mvn dependency:go-offline || true
COPY src ./src
# Empaquetar la aplicación omitiendo las pruebas unitarias
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución
FROM eclipse-temurin:17-jre
WORKDIR /app
# Copiar el .jar compilado desde la etapa "build"
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Exponer el puerto por el que escucha Spring Boot internamente
EXPOSE 8080

# Comando para ejecutar la aplicación
ENTRYPOINT ["java", "-jar", "app.jar"]
