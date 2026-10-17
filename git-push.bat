@echo off
REM ==============================================================================
REM ALIGN — Digital Queue Management Platform
REM Quick GitHub Push Utility (Batch)
REM ==============================================================================

setlocal enabledelayedexpansion

if "%~1"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-sync.ps1" -Push
) else (
    set "ARG1=%~1"
    if "!ARG1:~0,1!"=="-" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-sync.ps1" -Push %*
    ) else (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-sync.ps1" -Push -Message "%*"
    )
)
