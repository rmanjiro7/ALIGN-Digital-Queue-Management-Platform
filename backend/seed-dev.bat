@echo off
REM ============================================================================
REM ALIGN QMS - Seed Local Development Data
REM ============================================================================
REM Executes the development seed SQL against the local Docker PostgreSQL instance.
REM 
REM Prerequisites:
REM - Docker must be running.
REM - The PostgreSQL container from docker-compose.yml must be running.
REM ============================================================================

echo Seeding development data...

docker exec -i align_postgres psql -U align_user -d align_qms < dev\seed-dev.sql

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Seed failed. Make sure the database container is running.
    exit /b %ERRORLEVEL%
)

echo.
echo [SUCCESS] Seed complete!
