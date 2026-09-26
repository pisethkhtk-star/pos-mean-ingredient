@echo off
title POS Spring Boot Backend
echo ====================================================
echo Starting Spring Boot Backend for POS System...
echo Port: 5000 (Drop-in replacement for Express Backend)
echo ====================================================

cd /d "%~dp0backend-spring-boot"

if exist "build\libs\pos-backend-spring-boot-1.0.0.jar" (
    echo Launching pre-built JAR package...
    java -jar build\libs\pos-backend-spring-boot-1.0.0.jar
) else (
    echo Running via Gradle Wrapper...
    call gradlew.bat bootRun
)

pause
