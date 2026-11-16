@echo off
title POS Spring Boot Backend
echo ====================================================
echo Starting Spring Boot Backend for POS System...
echo Port: 5000 (Drop-in replacement for Express Backend)
echo ====================================================

if exist "%~dp0backend-spring-boot" (
    cd /d "%~dp0backend-spring-boot"
) else if exist "%~dp0..\backend-spring-boot" (
    cd /d "%~dp0..\backend-spring-boot"
) else if exist "%~dp0..\backend" (
    cd /d "%~dp0..\backend"
) else if exist "%~dp0backend" (
    cd /d "%~dp0backend"
)

if exist "build\libs\pos-backend-spring-boot-1.0.0.jar" (
    echo Launching pre-built JAR package...
    java -jar build\libs\pos-backend-spring-boot-1.0.0.jar
) else (
    echo Running via Gradle Wrapper...
    call gradlew.bat bootRun
)

pause
