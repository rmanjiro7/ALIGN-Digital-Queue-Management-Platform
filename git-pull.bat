@echo off
REM ==============================================================================
REM ALIGN — Digital Queue Management Platform
REM Quick GitHub Pull Utility (Batch)
REM ==============================================================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-sync.ps1" -Pull %*
