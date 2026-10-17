# ALIGN — GitHub Push & Pull Synchronization Guide

This document describes the automated Git synchronization scripts created for the **ALIGN Digital Queue Management Platform**.

These utilities provide a safe, automated, and streamlined workflow for pulling and pushing code between local workstations and the GitHub remote repository (`origin/main`).

---

## 1. Quick Start

### Windows (Command Prompt / Explorer)
| Task | Command | Description |
| :--- | :--- | :--- |
| **Pull from GitHub** | `.\git-pull.bat` | Fetches and pulls remote changes with automatic rebase & autostash |
| **Push to GitHub** | `.\git-push.bat` | Stages all changes, prompts for commit message, and pushes |
| **Push with Message** | `.\git-push.bat "feat: my commit"` | Commits and pushes without interactive prompts |
| **Interactive Menu** | `.\git-sync.bat` | Launches full interactive menu (Pull, Push, Sync, Status, Diff) |

### Windows (PowerShell)
| Task | Command | Description |
| :--- | :--- | :--- |
| **Interactive Menu** | `.\git-sync.ps1` | Interactive terminal UI with real-time status and telemetry |
| **Pull from GitHub** | `.\git-sync.ps1 -Pull` | Safe pull with `--rebase --autostash` |
| **Push to GitHub** | `.\git-sync.ps1 -Push` | Stages uncommitted changes, commits, and pushes |
| **Push with Message** | `.\git-sync.ps1 -Push -Message "feat: description"` | Direct non-interactive commit & push |
| **Full 2-Way Sync** | `.\git-sync.ps1 -Sync` | Commit active work → Pull latest remote → Push to GitHub |
| **Status Telemetry** | `.\git-sync.ps1 -Status` | Inspects ahead/behind counts, branches, and modified files |
| **Target Branch** | `.\git-sync.ps1 -Pull -Branch dev` | Pulls or pushes to an explicit branch |

### Git Bash / WSL / Linux / macOS
| Task | Command | Description |
| :--- | :--- | :--- |
| **Interactive Menu** | `./git-sync.sh` | Interactive bash menu |
| **Pull** | `./git-sync.sh pull [branch]` | Pulls latest remote updates |
| **Push** | `./git-sync.sh push ["message"] [branch]` | Stages, commits, and pushes to remote |
| **Full Sync** | `./git-sync.sh sync ["message"] [branch]` | Pulls and pushes in sequence |
| **Status** | `./git-sync.sh status` | Telemetry summary and commit log |

---

## 2. Key Safety Features

1. **Automatic Autostash & Rebase**:
   - When pulling, `git-sync` uses `--rebase --autostash` by default. This ensures any uncommitted work is safely stashed before pulling and restored automatically, preventing lost edits and unwanted merge commit clutter.
2. **Upstream Detection & Setup**:
   - If a new branch is pushed for the first time without an upstream tracking branch configured, the script automatically sets `-u origin <branch>`.
3. **Smart Commit Handling**:
   - If changes exist, the script displays a preview of modified files and prompts for a commit message (or generates an ISO timestamped message if left blank).
   - If no working tree changes exist but local commits are already queued (ahead of GitHub), it pushes the queued commits directly.
4. **Safe Error Handling**:
   - If merge conflicts occur during a pull or rebase, the script halts safely and outputs clear instructions on how to inspect (`git status`), continue (`git rebase --continue`), or abort (`git rebase --abort`).

---

## 3. Script Structure

- [`git-sync.ps1`](file:///d:/align/ALIGN-Digital-Queue-Management-Platform/git-sync.ps1) — Core PowerShell automation engine with interactive console menu, ANSI styling, and parameter dispatching.
- [`git-sync.bat`](file:///d:/align/ALIGN-Digital-Queue-Management-Platform/git-sync.bat) — Windows Command Prompt launcher executing PowerShell with `-ExecutionPolicy Bypass`.
- [`git-pull.bat`](file:///d:/align/ALIGN-Digital-Queue-Management-Platform/git-pull.bat) — One-click shortcut batch file for rapid pull operations.
- [`git-push.bat`](file:///d:/align/ALIGN-Digital-Queue-Management-Platform/git-push.bat) — One-click shortcut batch file for rapid commit and push operations.
- [`git-sync.sh`](file:///d:/align/ALIGN-Digital-Queue-Management-Platform/git-sync.sh) — Cross-platform POSIX Bash script for Git Bash, WSL, Linux, and macOS.
