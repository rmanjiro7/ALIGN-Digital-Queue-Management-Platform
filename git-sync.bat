@echo off
REM ==============================================================================
REM ALIGN — Digital Queue Management Platform
REM GitHub Push & Pull Synchronization Launcher (Batch)
REM ==============================================================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-sync.ps1" %*
