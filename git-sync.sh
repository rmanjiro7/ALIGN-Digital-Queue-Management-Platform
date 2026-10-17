#!/usr/bin/env bash
# ==============================================================================
# ALIGN — Digital Queue Management Platform
# GitHub Push & Pull Synchronization Script (Bash)
# ==============================================================================
#
# Usage:
#   ./git-sync.sh pull [branch]             - Fetch and pull latest changes
#   ./git-sync.sh push ["commit message"]   - Stage, commit, and push
#   ./git-sync.sh sync ["commit message"]   - Full sync (Commit -> Pull -> Push)
#   ./git-sync.sh status                    - View repository sync status
#   ./git-sync.sh                           - Interactive Menu
# ==============================================================================

set -e
export PAGER=cat

# Terminal colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Determine repository root
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

print_banner() {
    echo -e "${CYAN}"
    echo "=============================================================================="
    echo "   ___    __    ___   ______   _   __"
    echo "  /   |  / /   /   | / ____/  / | / /"
    echo " / /| | / /   / /| |/ / __   /  |/ / "
    echo "/ ___ |/ /___/ ___ / /_/ /  / /|  /  "
    echo "/_/  |_/_____/_/  |_\____/  /_/ |_/   Digital Queue Management Platform"
    echo ""
    echo "                 GitHub Synchronization Utility"
    echo "=============================================================================="
    echo -e "${NC}"
}

log_info() {
    echo -e "${CYAN} [INFO] ${NC}$1"
}

log_ok() {
    echo -e "${GREEN} [OK]   ${NC}$1"
}

log_warn() {
    echo -e "${YELLOW} [WARN] ${NC}$1"
}

log_err() {
    echo -e "${RED} [ERR]  ${NC}$1"
}

assert_git() {
    if ! command -v git &> /dev/null; then
        log_err "Git command line tool is not installed or not in PATH."
        exit 1
    fi

    if ! git rev-parse --is-inside-work-tree &> /dev/null; then
        log_err "Current directory is not inside a Git repository."
        exit 1
    fi
}

get_current_branch() {
    local b
    b=$(git branch --show-current 2>/dev/null || true)
    if [ -z "$b" ]; then
        b=$(git rev-parse --short HEAD 2>/dev/null || echo "HEAD")
    fi
    echo "$b"
}

do_pull() {
    local branch="${1:-$(get_current_branch)}"
    local remote="${2:-origin}"

    log_info "Starting Pull from $remote/$branch..."

    log_info "Fetching latest references..."
    if ! git fetch "$remote" "$branch"; then
        log_err "Failed to fetch from $remote/$branch."
        return 1
    fi

    log_info "Pulling with --rebase --autostash..."
    if git pull --rebase --autostash "$remote" "$branch"; then
        log_ok "Pull completed successfully. Local repository is up to date."
        echo ""
        echo -e "${GRAY}Recent commit log:${NC}"
        git log -n 3 --oneline --decorate --color=always
        echo ""
        return 0
    else
        log_err "Pull encountered conflicts or errors."
        echo -e "${YELLOW}Resolve conflicts and run 'git rebase --continue', or abort with 'git rebase --abort'.${NC}"
        return 1
    fi
}

do_push() {
    local message="$1"
    local branch="${2:-$(get_current_branch)}"
    local remote="${3:-origin}"

    log_info "Preparing Push to $remote/$branch..."

    # Check for uncommitted working tree changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warn "Working tree has uncommitted changes."
        git status -s

        if [ -z "$message" ]; then
            echo ""
            read -r -p " Enter commit message (or press Enter for automatic timestamp message): " user_msg
            if [ -z "$user_msg" ]; then
                message="chore: sync project updates [$(date +'%Y-%m-%d %H:%M')]"
            else
                message="$user_msg"
            fi
        fi

        log_info "Staging all changes (git add -A)..."
        git add -A

        log_info "Creating commit: \"$message\"..."
        git commit -m "$message"
        log_ok "Changes committed locally."
    fi

    # Check ahead status
    local tracking
    tracking=$(git rev-parse --abbrev-ref "@{upstream}" 2>/dev/null || true)
    local ahead=0
    if [ -n "$tracking" ]; then
        ahead=$(git rev-list --count "$tracking..HEAD" 2>/dev/null || echo 0)
    else
        ahead=$(git rev-list --count HEAD 2>/dev/null || echo 0)
    fi

    if [ "$ahead" -eq 0 ] && [ -n "$tracking" ]; then
        log_ok "Branch '$branch' is already in sync with '$remote/$branch'. Nothing to push."
        return 0
    fi

    log_info "Pushing commits ($ahead ahead)..."
    if [ -z "$tracking" ]; then
        log_info "Setting upstream tracking (-u)..."
        git push -u "$remote" "$branch"
    else
        git push "$remote" "$branch"
    fi

    if [ $? -eq 0 ]; then
        log_ok "Successfully pushed '$branch' to '$remote' on GitHub!"
        echo ""
        git log -n 1 --oneline --decorate --color=always
        echo ""
        return 0
    else
        log_err "Push failed. Try pulling latest remote changes first with sync/pull."
        return 1
    fi
}

do_sync() {
    local message="$1"
    local branch="${2:-$(get_current_branch)}"
    local remote="${3:-origin}"

    log_info "==========================================================="
    log_info "STEP 1/3: Checking local status & committing active changes"
    log_info "==========================================================="
    if [ -n "$(git status --porcelain)" ]; then
        if [ -z "$message" ]; then
            read -r -p " Enter commit message for current changes: " user_msg
            if [ -z "$user_msg" ]; then
                message="chore: sync project updates [$(date +'%Y-%m-%d %H:%M')]"
            else
                message="$user_msg"
            fi
        fi
        git add -A
        git commit -m "$message"
        log_ok "Local changes committed."
    else
        log_info "Working tree clean. No local uncommitted changes."
    fi

    echo ""
    log_info "==========================================================="
    log_info "STEP 2/3: Pulling latest changes from GitHub"
    log_info "==========================================================="
    if ! do_pull "$branch" "$remote"; then
        log_err "Sync halted due to pull error."
        return 1
    fi

    echo ""
    log_info "==========================================================="
    log_info "STEP 3/3: Pushing commits to GitHub"
    log_info "==========================================================="
    if do_push "" "$branch" "$remote"; then
        echo ""
        log_ok "ALIGN Synchronization Complete! Local and GitHub are in sync."
        return 0
    else
        log_err "Push phase of sync failed."
        return 1
    fi
}

do_status() {
    local remote="${1:-origin}"
    local branch
    branch=$(get_current_branch)
    local remote_url
    remote_url=$(git remote get-url "$remote" 2>/dev/null || echo "Unknown")
    local tracking
    tracking=$(git rev-parse --abbrev-ref "@{upstream}" 2>/dev/null || echo "None")

    print_banner
    echo -e "${GRAY}-- Repository Status & Telemetry -----------------------------------------${NC}"
    echo -e " Repository Root : ${REPO_ROOT}"
    echo -e " Active Branch   : ${CYAN}${branch}${NC}"
    echo -e " Remote Target   : ${remote} (${remote_url})"
    echo -e " Upstream Track  : ${tracking}"

    if [ "$tracking" != "None" ]; then
        local counts
        counts=$(git rev-list --left-right --count "$tracking...HEAD" 2>/dev/null || echo "0 0")
        local behind ahead
        behind=$(echo "$counts" | awk '{print $1}')
        ahead=$(echo "$counts" | awk '{print $2}')
        echo -e " Commits Ahead   : ${ahead} (Unpushed to GitHub)"
        echo -e " Commits Behind  : ${behind} (Unpulled from GitHub)"
    fi

    if [ -n "$(git status --porcelain)" ]; then
        local file_count
        file_count=$(git status --porcelain | wc -l)
        echo -e " Working Tree    : ${YELLOW}Dirty (${file_count} changed files)${NC}"
    else
        echo -e " Working Tree    : ${GREEN}Clean (No uncommitted changes)${NC}"
    fi

    echo -e "${GRAY}--------------------------------------------------------------------------${NC}"
    echo -e "Recent 5 Commits:"
    git log -n 5 --oneline --decorate --color=always
    echo -e "${GRAY}--------------------------------------------------------------------------${NC}"
}

interactive_menu() {
    while true; do
        clear || true
        local branch
        branch=$(get_current_branch)
        print_banner
        echo -e " Active Branch: [${CYAN}${branch}${NC}] | Remote: [origin]"
        echo -e "${GRAY}==============================================================================${NC}"
        echo -e "  [1] PULL   - Fetch and pull latest changes from GitHub"
        echo -e "  [2] PUSH   - Stage, commit, and push changes to GitHub"
        echo -e "  [3] SYNC   - Full Sync (Commit -> Pull --rebase -> Push)"
        echo -e "  [4] STATUS - Detailed repository status and recent commits"
        echo -e "  [5] DIFF   - Inspect working tree differences (git diff)"
        echo -e "  [6] EXIT   - Quit"
        echo -e "${GRAY}==============================================================================${NC}"
        echo ""
        read -r -p "Select an option [1-6]: " choice
        echo ""

        case "$choice" in
            1)
                do_pull "$branch"
                echo ""
                read -r -p "Press Enter to return to menu" _
                ;;
            2)
                do_push "" "$branch"
                echo ""
                read -r -p "Press Enter to return to menu" _
                ;;
            3)
                do_sync "" "$branch"
                echo ""
                read -r -p "Press Enter to return to menu" _
                ;;
            4)
                do_status
                echo ""
                read -r -p "Press Enter to return to menu" _
                ;;
            5)
                git diff --stat
                echo ""
                git status -s
                echo ""
                read -r -p "Press Enter to return to menu" _
                ;;
            6)
                log_info "Exiting ALIGN GitHub Synchronization Utility."
                exit 0
                ;;
            *)
                log_warn "Invalid selection."
                sleep 1
                ;;
        esac
    done
}

# ------------------------------------------------------------------------------
# Entrypoint Dispatcher
# ------------------------------------------------------------------------------
assert_git

action="$1"
case "$action" in
    pull)
        print_banner
        do_pull "$2" "$3"
        ;;
    push)
        print_banner
        do_push "$2" "$3" "$4"
        ;;
    sync)
        print_banner
        do_sync "$2" "$3" "$4"
        ;;
    status)
        do_status "$2"
        ;;
    *)
        if [ -n "$action" ]; then
            log_err "Unknown command: $action. Use 'pull', 'push', 'sync', or 'status'."
            exit 1
        else
            interactive_menu
        fi
        ;;
esac
