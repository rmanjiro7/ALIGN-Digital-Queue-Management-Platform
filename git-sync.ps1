# ==============================================================================
# ALIGN — Digital Queue Management Platform
# GitHub Push & Pull Synchronization Script (PowerShell)
# ==============================================================================
#
# Usage:
#   .\git-sync.ps1                  - Interactive Menu (Pull, Push, Sync, Status)
#   .\git-sync.ps1 -Pull            - Fetch and pull latest changes from GitHub
#   .\git-sync.ps1 -Push            - Stage, commit, and push changes to GitHub
#   .\git-sync.ps1 -Push -Message "feat: add feature"
#   .\git-sync.ps1 -Sync            - Full sync: commit -> pull --rebase -> push
#   .\git-sync.ps1 -Status          - Check branch, ahead/behind count, and files
#   .\git-sync.ps1 -Branch <name>   - Target a specific branch
#   .\git-sync.ps1 -Remote <name>   - Target a specific remote (default: origin)
# ==============================================================================

[CmdletBinding(DefaultParameterSetName = "Default")]
param (
    [Parameter(ParameterSetName = "Pull")]
    [switch]$Pull,

    [Parameter(ParameterSetName = "Push")]
    [switch]$Push,

    [Parameter(ParameterSetName = "Sync")]
    [switch]$Sync,

    [Parameter(ParameterSetName = "Status")]
    [switch]$Status,

    [Parameter(ParameterSetName = "Push")]
    [Parameter(ParameterSetName = "Sync")]
    [Parameter(ParameterSetName = "Default")]
    [string]$Message,

    [Parameter()]
    [string]$Branch,

    [Parameter()]
    [string]$Remote = "origin",

    [Parameter()]
    [switch]$NoRebase,

    [Parameter()]
    [switch]$ForceWithLease,

    [Parameter()]
    [switch]$NonInteractive
)

# ------------------------------------------------------------------------------
# ENVIRONMENT & DIRECTORY SETUP
# ------------------------------------------------------------------------------
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { Get-Location }
Set-Location $ScriptDir

# ------------------------------------------------------------------------------
# CONSOLE FORMATTING HELPERS
# ------------------------------------------------------------------------------
function Write-AlignBanner {
    Write-Host @"

==============================================================================
   ___    __    ___   ______   _   __
  /   |  / /   /   | / ____/  / | / /
 / /| | / /   / /| |/ / __   /  |/ / 
/ ___ |/ /___/ ___ / /_/ /  / /|  /  
/_/  |_/_____/_/  |_\____/  /_/ |_/   Digital Queue Management Platform

                 GitHub Synchronization Utility
==============================================================================
"@ -ForegroundColor Cyan
}

function Write-InfoMessage ($msg) {
    Write-Host " [INFO] " -ForegroundColor Cyan -NoNewline
    Write-Host $msg
}

function Write-SuccessMessage ($msg) {
    Write-Host " [OK]   " -ForegroundColor Green -NoNewline
    Write-Host $msg
}

function Write-WarnMessage ($msg) {
    Write-Host " [WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host $msg
}

function Write-ErrorMessage ($msg) {
    Write-Host " [ERR]  " -ForegroundColor Red -NoNewline
    Write-Host $msg
}

# ------------------------------------------------------------------------------
# PREFLIGHT CHECKS
# ------------------------------------------------------------------------------
function Assert-GitRepository {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-ErrorMessage "Git command line tool is not installed or not in PATH."
        Write-Host "       Please install Git from https://git-scm.com/" -ForegroundColor Yellow
        exit 1
    }

    $isGitRepo = git rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -ne 0 -or $isGitRepo -ne "true") {
        Write-ErrorMessage "The current directory is not inside a Git repository."
        Write-Host "       Current directory: $ScriptDir" -ForegroundColor Yellow
        exit 1
    }

    # Ensure working location is repository root
    $repoRoot = git rev-parse --show-toplevel 2>$null
    if ($repoRoot -and (Test-Path $repoRoot)) {
        Set-Location $repoRoot
    }
}

# ------------------------------------------------------------------------------
# GIT CONTEXT GATHERING
# ------------------------------------------------------------------------------
function Get-GitContext {
    param ([string]$TargetRemote = "origin")

    $currentBranch = git branch --show-current 2>$null
    if (-not $currentBranch) {
        $currentBranch = git rev-parse --short HEAD 2>$null
    }

    $remoteUrl = git remote get-url $TargetRemote 2>$null
    $hasRemote = ($LASTEXITCODE -eq 0 -and [bool]$remoteUrl)

    $trackingBranch = git rev-parse --abbrev-ref "@{upstream}" 2>$null
    $hasTracking = ($LASTEXITCODE -eq 0 -and [bool]$trackingBranch)

    $ahead = 0
    $behind = 0
    if ($hasTracking) {
        $counts = git rev-list --left-right --count "$trackingBranch...HEAD" 2>$null
        if ($counts) {
            $parts = $counts.Trim() -split "\s+"
            if ($parts.Count -ge 2) {
                $behind = [int]$parts[0]
                $ahead  = [int]$parts[1]
            }
        }
    } else {
        # If no upstream is set yet, count commits not in remote if remote branch exists
        $remoteCheck = git ls-remote --heads $TargetRemote $currentBranch 2>$null
        if ($remoteCheck) {
            $ahead = [int](git rev-list --count "$TargetRemote/$currentBranch..HEAD" 2>$null)
        } else {
            $ahead = [int](git rev-list --count HEAD 2>$null)
        }
    }

    $statusLines = @(git status --porcelain 2>$null)
    $hasChanges = ($statusLines.Count -gt 0 -and [bool]$statusLines[0])
    $modifiedCount = 0
    $untrackedCount = 0
    $stagedCount = 0

    foreach ($line in $statusLines) {
        if (-not $line) { continue }
        $x = $line.Substring(0, 1)
        $y = if ($line.Length -ge 2) { $line.Substring(1, 1) } else { " " }
        if ($x -eq "?" -and $y -eq "?") {
            $untrackedCount++
        } else {
            if ($x -ne " " -and $x -ne "?") { $stagedCount++ }
            if ($y -ne " " -and $y -ne "?") { $modifiedCount++ }
        }
    }

    return [PSCustomObject]@{
        Branch         = $currentBranch
        Remote         = $TargetRemote
        RemoteUrl      = $remoteUrl
        HasRemote      = $hasRemote
        TrackingBranch = $trackingBranch
        HasTracking    = $hasTracking
        Ahead          = $ahead
        Behind         = $behind
        HasChanges     = $hasChanges
        StatusLines    = $statusLines
        ModifiedCount  = $modifiedCount
        UntrackedCount = $untrackedCount
        StagedCount    = $stagedCount
    }
}

# ------------------------------------------------------------------------------
# PULL LOGIC
# ------------------------------------------------------------------------------
function Invoke-AlignPull {
    param (
        [string]$TargetBranch,
        [string]$TargetRemote = "origin",
        [bool]$UseRebase = $true
    )

    Write-InfoMessage "Starting Pull from $TargetRemote..."

    $context = Get-GitContext -TargetRemote $TargetRemote
    if (-not $TargetBranch) {
        $TargetBranch = $context.Branch
    }

    if (-not $context.HasRemote) {
        Write-ErrorMessage "Remote '$TargetRemote' not found."
        Write-Host "       Check configured remotes with: git remote -v" -ForegroundColor Yellow
        return $false
    }

    Write-InfoMessage "Target Branch : $TargetBranch"
    Write-InfoMessage "Remote URL    : $($context.RemoteUrl)"

    # Fetch latest branch metadata from remote
    Write-InfoMessage "Fetching latest references from $TargetRemote..."
    git fetch $TargetRemote $TargetBranch
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Failed to fetch from $TargetRemote/$TargetBranch. Check network connection or GitHub permissions."
        return $false
    }

    # Execute pull
    if ($UseRebase) {
        Write-InfoMessage "Pulling changes using --rebase --autostash..."
        git pull --rebase --autostash $TargetRemote $TargetBranch
    } else {
        Write-InfoMessage "Pulling changes using standard merge..."
        git pull $TargetRemote $TargetBranch
    }

    if ($LASTEXITCODE -eq 0) {
        Write-SuccessMessage "Pull completed successfully. Local repository is updated."
        
        # Display latest 3 commits
        Write-Host ""
        Write-Host "Recent commit log:" -ForegroundColor DarkGray
        git log -n 3 --oneline --decorate | Out-Host
        Write-Host ""
        return $true
    } else {
        Write-ErrorMessage "Pull encountered merge conflicts or errors."
        Write-Host "       Run 'git status' to inspect conflicts." -ForegroundColor Yellow
        Write-Host "       To abort the rebase: git rebase --abort" -ForegroundColor Yellow
        Write-Host "       To continue after fixing: git rebase --continue" -ForegroundColor Yellow
        return $false
    }
}

# ------------------------------------------------------------------------------
# PUSH LOGIC
# ------------------------------------------------------------------------------
function Invoke-AlignPush {
    param (
        [string]$TargetBranch,
        [string]$TargetRemote = "origin",
        [string]$CommitMessage,
        [bool]$SafeForce = $false
    )

    Write-InfoMessage "Preparing Push to $TargetRemote..."

    $context = Get-GitContext -TargetRemote $TargetRemote
    if (-not $TargetBranch) {
        $TargetBranch = $context.Branch
    }

    if (-not $context.HasRemote) {
        Write-ErrorMessage "Remote '$TargetRemote' not found."
        Write-Host "       Check configured remotes with: git remote -v" -ForegroundColor Yellow
        return $false
    }

    Write-InfoMessage "Target Branch : $TargetBranch"
    Write-InfoMessage "Remote URL    : $($context.RemoteUrl)"

    # Handle uncommitted working tree changes
    if ($context.HasChanges) {
        Write-WarnMessage "Working tree has uncommitted changes ($($context.StatusLines.Count) file(s))."
        
        # Display preview of changed files
        $previewCount = [Math]::Min($context.StatusLines.Count, 8)
        for ($i = 0; $i -lt $previewCount; $i++) {
            Write-Host "       $($context.StatusLines[$i])" -ForegroundColor DarkGray
        }
        if ($context.StatusLines.Count -gt $previewCount) {
            Write-Host "       ... and $($context.StatusLines.Count - $previewCount) more file(s)" -ForegroundColor DarkGray
        }

        # Prompt for commit message if not provided
        if (-not $CommitMessage) {
            Write-Host ""
            $userMsg = Read-Host " Enter commit message (or press Enter for automatic timestamp message)"
            if ([string]::IsNullOrWhiteSpace($userMsg)) {
                $CommitMessage = "chore: sync project updates [$(Get-Date -Format 'yyyy-MM-dd HH:mm')]"
            } else {
                $CommitMessage = $userMsg.Trim()
            }
        }

        Write-InfoMessage "Staging all changes (git add -A)..."
        git add -A
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "Failed to stage changes."
            return $false
        }

        Write-InfoMessage "Creating commit: `"$CommitMessage`"..."
        git commit -m $CommitMessage
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "Commit failed. Check output above."
            return $false
        }
        Write-SuccessMessage "Changes committed locally."
    }

    # Refresh context after commit
    $context = Get-GitContext -TargetRemote $TargetRemote

    # Verify if there is anything to push
    if ($context.Ahead -eq 0 -and $context.HasTracking) {
        Write-SuccessMessage "Branch '$TargetBranch' is already in sync with '$TargetRemote/$TargetBranch'. Nothing to push."
        return $true
    }

    Write-InfoMessage "Commits to push: $($context.Ahead) commit(s) ahead of remote."

    # Push to remote
    $pushArgs = @($TargetRemote, $TargetBranch)
    if (-not $context.HasTracking) {
        Write-InfoMessage "First time pushing this branch. Setting upstream tracking (-u)..."
        $pushArgs = @("-u", $TargetRemote, $TargetBranch)
    } elseif ($SafeForce) {
        Write-WarnMessage "Using safe force-push (--force-with-lease)..."
        $pushArgs += "--force-with-lease"
    }

    git push @pushArgs
    if ($LASTEXITCODE -eq 0) {
        Write-SuccessMessage "Successfully pushed '$TargetBranch' to '$TargetRemote' on GitHub!"
        Write-Host ""
        Write-Host "Latest pushed commit:" -ForegroundColor DarkGray
        git log -n 1 --oneline --decorate | Out-Host
        Write-Host ""
        return $true
    } else {
        Write-ErrorMessage "Push was rejected or failed."
        Write-Host "       Remote may contain commits you don't have locally." -ForegroundColor Yellow
        Write-Host "       Recommendation: Run a pull/sync first, then push again:" -ForegroundColor Yellow
        Write-Host "       .\git-sync.ps1 -Sync" -ForegroundColor Cyan
        return $false
    }
}

# ------------------------------------------------------------------------------
# FULL TWO-WAY SYNC LOGIC
# ------------------------------------------------------------------------------
function Invoke-AlignSync {
    param (
        [string]$TargetBranch,
        [string]$TargetRemote = "origin",
        [string]$CommitMessage,
        [bool]$UseRebase = $true
    )

    Write-InfoMessage "==========================================================="
    Write-InfoMessage "STEP 1/3: Checking local status & committing active changes"
    Write-InfoMessage "==========================================================="

    $context = Get-GitContext -TargetRemote $TargetRemote
    if (-not $TargetBranch) {
        $TargetBranch = $context.Branch
    }

    if ($context.HasChanges) {
        if (-not $CommitMessage) {
            Write-Host ""
            $userMsg = Read-Host " Enter commit message for current changes (or Enter for timestamp)"
            if ([string]::IsNullOrWhiteSpace($userMsg)) {
                $CommitMessage = "chore: sync project updates [$(Get-Date -Format 'yyyy-MM-dd HH:mm')]"
            } else {
                $CommitMessage = $userMsg.Trim()
            }
        }

        Write-InfoMessage "Staging changes..."
        git add -A
        git commit -m $CommitMessage
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "Failed to commit changes before sync."
            return $false
        }
        Write-SuccessMessage "Local changes committed."
    } else {
        Write-InfoMessage "Working tree clean. No local uncommitted changes."
    }

    Write-Host ""
    Write-InfoMessage "==========================================================="
    Write-InfoMessage "STEP 2/3: Pulling latest changes from GitHub"
    Write-InfoMessage "==========================================================="

    $pullOk = Invoke-AlignPull -TargetBranch $TargetBranch -TargetRemote $TargetRemote -UseRebase $UseRebase
    if (-not $pullOk) {
        Write-ErrorMessage "Sync stopped due to pull error. Please resolve before pushing."
        return $false
    }

    Write-Host ""
    Write-InfoMessage "==========================================================="
    Write-InfoMessage "STEP 3/3: Pushing commits to GitHub"
    Write-InfoMessage "==========================================================="

    $pushOk = Invoke-AlignPush -TargetBranch $TargetBranch -TargetRemote $TargetRemote
    if ($pushOk) {
        Write-Host ""
        Write-SuccessMessage "ALIGN Synchronization Complete! Local and GitHub are in sync."
        return $true
    } else {
        Write-ErrorMessage "Push phase of sync failed."
        return $false
    }
}

# ------------------------------------------------------------------------------
# STATUS REPORT
# ------------------------------------------------------------------------------
function Show-AlignStatusReport {
    param ([string]$TargetRemote = "origin")

    $context = Get-GitContext -TargetRemote $TargetRemote

    Write-AlignBanner
    Write-Host "-- Repository Status & Telemetry -----------------------------------------" -ForegroundColor DarkGray
    Write-Host " Repository Root : " -ForegroundColor Gray -NoNewline
    Write-Host (Get-Location).Path -ForegroundColor White
    Write-Host " Active Branch   : " -ForegroundColor Gray -NoNewline
    Write-Host $context.Branch -ForegroundColor Cyan
    Write-Host " Remote Target   : " -ForegroundColor Gray -NoNewline
    Write-Host "$TargetRemote ($($context.RemoteUrl))" -ForegroundColor White
    Write-Host " Upstream Track  : " -ForegroundColor Gray -NoNewline
    if ($context.HasTracking) {
        Write-Host $context.TrackingBranch -ForegroundColor Green
    } else {
        Write-Host "None (will set on first push)" -ForegroundColor Yellow
    }

    Write-Host " Commits Ahead   : " -ForegroundColor Gray -NoNewline
    if ($context.Ahead -gt 0) {
        Write-Host "$($context.Ahead) (Unpushed to GitHub)" -ForegroundColor Yellow
    } else {
        Write-Host "0 (Up to date)" -ForegroundColor Green
    }

    Write-Host " Commits Behind  : " -ForegroundColor Gray -NoNewline
    if ($context.Behind -gt 0) {
        Write-Host "$($context.Behind) (Unpulled from GitHub)" -ForegroundColor Red
    } else {
        Write-Host "0 (Up to date)" -ForegroundColor Green
    }

    Write-Host " Working Tree    : " -ForegroundColor Gray -NoNewline
    if ($context.HasChanges) {
        Write-Host "Dirty ($($context.StatusLines.Count) file(s) modified/untracked)" -ForegroundColor Yellow
    } else {
        Write-Host "Clean (No uncommitted changes)" -ForegroundColor Green
    }

    Write-Host "--------------------------------------------------------------------------" -ForegroundColor DarkGray

    # Show recent commits
    Write-Host "Recent 5 Commits:" -ForegroundColor Gray
    git log -n 5 --oneline --decorate | Out-Host
    Write-Host "--------------------------------------------------------------------------" -ForegroundColor DarkGray

    if ($context.HasChanges) {
        Write-Host "Modified/Untracked Files Summary (first 10):" -ForegroundColor Gray
        $count = [Math]::Min($context.StatusLines.Count, 10)
        for ($i = 0; $i -lt $count; $i++) {
            Write-Host "  $($context.StatusLines[$i])" -ForegroundColor DarkCyan
        }
        if ($context.StatusLines.Count -gt 10) {
            Write-Host "  ... and $($context.StatusLines.Count - 10) more file(s)" -ForegroundColor DarkGray
        }
        Write-Host "--------------------------------------------------------------------------" -ForegroundColor DarkGray
    }
}

# ------------------------------------------------------------------------------
# INTERACTIVE MENU
# ------------------------------------------------------------------------------
function Show-InteractiveMenu {
    param (
        [string]$TargetBranch,
        [string]$TargetRemote = "origin"
    )

    while ($true) {
        Clear-Host
        $context = Get-GitContext -TargetRemote $TargetRemote
        $branchName = if ($TargetBranch) { $TargetBranch } else { $context.Branch }

        Write-AlignBanner
        Write-Host " Branch: [$branchName]  |  Remote: [$TargetRemote]  |  Ahead: [$($context.Ahead)]  |  Behind: [$($context.Behind)]" -ForegroundColor White
        Write-Host " Working Tree: $(if ($context.HasChanges) { "$($context.StatusLines.Count) uncommitted file(s)" } else { "Clean" })" -ForegroundColor $(if ($context.HasChanges) { "Yellow" } else { "Green" })
        Write-Host "==============================================================================" -ForegroundColor DarkGray
        Write-Host "  [1] " -ForegroundColor Cyan -NoNewline
        Write-Host "PULL  - Fetch and pull latest changes from GitHub"
        Write-Host "  [2] " -ForegroundColor Cyan -NoNewline
        Write-Host "PUSH  - Stage, commit, and push changes to GitHub"
        Write-Host "  [3] " -ForegroundColor Cyan -NoNewline
        Write-Host "SYNC  - Full Sync (Commit -> Pull --rebase -> Push)"
        Write-Host "  [4] " -ForegroundColor Cyan -NoNewline
        Write-Host "STATUS - Detailed repository status and recent commits"
        Write-Host "  [5] " -ForegroundColor Cyan -NoNewline
        Write-Host "DIFF  - Inspect working tree differences (git diff)"
        Write-Host "  [6] " -ForegroundColor Cyan -NoNewline
        Write-Host "EXIT  - Quit"
        Write-Host "==============================================================================" -ForegroundColor DarkGray
        Write-Host ""

        $choice = Read-Host "Select an option [1-6]"
        Write-Host ""

        switch ($choice) {
            "1" {
                Invoke-AlignPull -TargetBranch $branchName -TargetRemote $TargetRemote -UseRebase (-not $NoRebase)
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "2" {
                Invoke-AlignPush -TargetBranch $branchName -TargetRemote $TargetRemote
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "3" {
                Invoke-AlignSync -TargetBranch $branchName -TargetRemote $TargetRemote -UseRebase (-not $NoRebase)
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "4" {
                Show-AlignStatusReport -TargetRemote $TargetRemote
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "5" {
                Write-Host "--- git diff --stat ---" -ForegroundColor DarkGray
                git diff --stat
                Write-Host ""
                Write-Host "--- git status -s ---" -ForegroundColor DarkGray
                git status -s
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "6" {
                Write-InfoMessage "Exiting ALIGN GitHub Synchronization Utility. Goodbye!"
                exit 0
            }
            default {
                Write-WarnMessage "Invalid selection. Please choose 1 to 6."
                Start-Sleep -Seconds 1
            }
        }
    }
}

# ------------------------------------------------------------------------------
# MAIN ENTRYPOINT
# ------------------------------------------------------------------------------
Assert-GitRepository

$useRebase = (-not $NoRebase)

if ($Pull) {
    Write-AlignBanner
    $null = Invoke-AlignPull -TargetBranch $Branch -TargetRemote $Remote -UseRebase $useRebase
} elseif ($Push) {
    Write-AlignBanner
    $null = Invoke-AlignPush -TargetBranch $Branch -TargetRemote $Remote -CommitMessage $Message -SafeForce $ForceWithLease
} elseif ($Sync) {
    Write-AlignBanner
    $null = Invoke-AlignSync -TargetBranch $Branch -TargetRemote $Remote -CommitMessage $Message -UseRebase $useRebase
} elseif ($Status) {
    Show-AlignStatusReport -TargetRemote $Remote
} else {
    if ($NonInteractive) {
        Show-AlignStatusReport -TargetRemote $Remote
    } else {
        Show-InteractiveMenu -TargetBranch $Branch -TargetRemote $Remote
    }
}
