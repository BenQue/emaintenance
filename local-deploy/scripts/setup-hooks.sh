#!/bin/bash

# Git Hooks Setup Script
# This script installs and configures Git hooks for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[SETUP-HOOKS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
HOOKS_DIR="${SCRIPT_DIR}/../hooks"
GIT_HOOKS_DIR="${PROJECT_ROOT}/.git/hooks"

log "Setting up Git hooks for E-Maintenance project"
log "Project root: $PROJECT_ROOT"
log "Hooks directory: $HOOKS_DIR"
log "Git hooks directory: $GIT_HOOKS_DIR"

# Check if we're in a Git repository
if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
    error "Not in a Git repository"
    exit 1
fi

# Create .git/hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Install pre-commit hook
if [[ -f "$HOOKS_DIR/pre-commit" ]]; then
    log "Installing pre-commit hook..."
    
    # Backup existing hook if it exists
    if [[ -f "$GIT_HOOKS_DIR/pre-commit" ]]; then
        log "Backing up existing pre-commit hook..."
        cp "$GIT_HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Copy and make executable
    cp "$HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
    chmod +x "$GIT_HOOKS_DIR/pre-commit"
    
    success "Pre-commit hook installed"
else
    warning "Pre-commit hook not found in $HOOKS_DIR"
fi

# Create post-commit hook for automatic builds
log "Creating post-commit hook..."
cat > "$GIT_HOOKS_DIR/post-commit" << 'EOF'
#!/bin/bash

# Post-commit hook for automatic builds
# This hook can trigger builds on certain conditions

# Get project root
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
cd "$PROJECT_ROOT"

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[POST-COMMIT]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Get commit information
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

log "Post-commit hook triggered"
log "Branch: $BRANCH_NAME"
log "Commit: $COMMIT_HASH"

# Check if this is a significant commit that should trigger a build
SHOULD_BUILD=false

# Build on main/master branch
if [[ "$BRANCH_NAME" == "main" ]] || [[ "$BRANCH_NAME" == "master" ]]; then
    SHOULD_BUILD=true
fi

# Build if commit message contains build triggers
if echo "$COMMIT_MESSAGE" | grep -qi "\[build\]\|\[deploy\]\|build:"; then
    SHOULD_BUILD=true
fi

# Build if significant files changed
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r $COMMIT_HASH)
if echo "$CHANGED_FILES" | grep -E "(Dockerfile|package\.json|\.ts$|\.tsx$)" | head -5 | wc -l | grep -q "[5-9]"; then
    SHOULD_BUILD=true
fi

if [[ "$SHOULD_BUILD" == "true" ]]; then
    log "Triggering automatic build due to significant changes"
    
    # Check if local-deploy scripts exist
    if [[ -f "local-deploy/scripts/ci-cd-pipeline.sh" ]]; then
        echo "Run automatic build? (y/N): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            log "Starting automatic build..."
            ./local-deploy/scripts/ci-cd-pipeline.sh build --tag "auto_$(date +%Y%m%d_%H%M%S)_${COMMIT_HASH:0:7}" || true
        fi
    fi
fi

success "Post-commit hook completed"
EOF

chmod +x "$GIT_HOOKS_DIR/post-commit"
success "Post-commit hook created"

# Create prepare-commit-msg hook for commit message templates
log "Creating prepare-commit-msg hook..."
cat > "$GIT_HOOKS_DIR/prepare-commit-msg" << 'EOF'
#!/bin/bash

# Prepare commit message hook
# This hook adds metadata and formatting to commit messages

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2
SHA1=$3

# Don't modify merge commits or other special commits
if [[ "$COMMIT_SOURCE" == "merge" ]] || [[ "$COMMIT_SOURCE" == "squash" ]] || [[ "$COMMIT_SOURCE" == "commit" ]]; then
    exit 0
fi

# Get branch name
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

# Add branch info for feature branches
if [[ "$BRANCH_NAME" =~ ^(feature|bugfix|hotfix)/ ]]; then
    ISSUE_NUMBER=$(echo "$BRANCH_NAME" | sed -n 's/.*\/\([0-9]\+\).*/\1/p')
    if [[ -n "$ISSUE_NUMBER" ]]; then
        echo "" >> "$COMMIT_MSG_FILE"
        echo "Related to issue #$ISSUE_NUMBER" >> "$COMMIT_MSG_FILE"
    fi
fi

# Add build info comment
echo "" >> "$COMMIT_MSG_FILE"
echo "# Build info:" >> "$COMMIT_MSG_FILE"
echo "# Branch: $BRANCH_NAME" >> "$COMMIT_MSG_FILE"
echo "# Date: $(date)" >> "$COMMIT_MSG_FILE"
echo "# User: $(git config user.name)" >> "$COMMIT_MSG_FILE"

# Add helpful reminders
echo "" >> "$COMMIT_MSG_FILE"
echo "# Commit message guidelines:" >> "$COMMIT_MSG_FILE"
echo "# - Use present tense (\"add feature\" not \"added feature\")" >> "$COMMIT_MSG_FILE"
echo "# - Use imperative mood (\"move cursor to...\" not \"moves cursor to...\")" >> "$COMMIT_MSG_FILE"
echo "# - Limit first line to 72 characters or less" >> "$COMMIT_MSG_FILE"
echo "# - Reference issues and pull requests liberally after the first line" >> "$COMMIT_MSG_FILE"
echo "# - Add [build] or [deploy] to trigger automatic builds" >> "$COMMIT_MSG_FILE"
EOF

chmod +x "$GIT_HOOKS_DIR/prepare-commit-msg"
success "Prepare-commit-msg hook created"

# Create commit-msg hook for validation
log "Creating commit-msg hook..."
cat > "$GIT_HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash

# Commit message validation hook
# This hook validates commit message format and content

COMMIT_MSG_FILE=$1

# Read the commit message
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

error() {
    echo -e "${RED}[COMMIT-MSG ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[COMMIT-MSG WARNING]${NC} $1"
}

# Remove comment lines for validation
CLEAN_MSG=$(echo "$COMMIT_MSG" | grep -v '^#' | sed '/^\s*$/d')

# Check if message is empty
if [[ -z "$CLEAN_MSG" ]]; then
    error "Commit message cannot be empty"
    exit 1
fi

# Get first line
FIRST_LINE=$(echo "$CLEAN_MSG" | head -1)

# Check first line length
if [[ ${#FIRST_LINE} -gt 72 ]]; then
    warning "First line is longer than 72 characters (${#FIRST_LINE})"
    echo "Consider shortening the commit message summary"
fi

# Check for proper capitalization
if [[ ! "$FIRST_LINE" =~ ^[A-Z] ]]; then
    warning "First line should start with a capital letter"
fi

# Check for period at end of first line
if [[ "$FIRST_LINE" =~ \.$ ]]; then
    warning "First line should not end with a period"
fi

# Check for conventional commit format (optional)
if [[ "$FIRST_LINE" =~ ^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?: ]]; then
    # Conventional commit format detected
    echo "Conventional commit format detected ✓"
else
    # Check for common prefixes
    if [[ "$FIRST_LINE" =~ ^(add|update|fix|remove|improve|refactor): ]]; then
        echo "Good commit message format ✓"
    else
        warning "Consider using conventional commit format or imperative mood"
        echo "Examples: 'feat: add user authentication' or 'fix: resolve login issue'"
    fi
fi

# Check for sensitive information in commit message
if echo "$CLEAN_MSG" | grep -qi "password\|secret\|token\|key\|credential"; then
    error "Commit message contains potentially sensitive information"
    exit 1
fi

echo "Commit message validation passed ✓"
EOF

chmod +x "$GIT_HOOKS_DIR/commit-msg"
success "Commit-msg hook created"

# Create hook management script
log "Creating hook management script..."
cat > "$PROJECT_ROOT/manage-hooks.sh" << 'EOF'
#!/bin/bash

# Git Hooks Management Script
# Usage: ./manage-hooks.sh [enable|disable|status]

HOOKS_DIR=".git/hooks"

case "$1" in
    "enable")
        echo "Enabling Git hooks..."
        find "$HOOKS_DIR" -name "*.sample" -exec bash -c 'mv "$1" "${1%.sample}"' _ {} \;
        find "$HOOKS_DIR" -type f ! -name "*.sample" -exec chmod +x {} \;
        echo "Git hooks enabled"
        ;;
    "disable")
        echo "Disabling Git hooks..."
        find "$HOOKS_DIR" -type f ! -name "*.sample" -exec mv {} {}.disabled \;
        echo "Git hooks disabled (renamed to .disabled)"
        ;;
    "status")
        echo "Git hooks status:"
        ls -la "$HOOKS_DIR" | grep -v "\.sample" | grep -v "^total"
        ;;
    *)
        echo "Usage: $0 [enable|disable|status]"
        echo ""
        echo "  enable    Enable all Git hooks"
        echo "  disable   Disable all Git hooks"
        echo "  status    Show current hook status"
        ;;
esac
EOF

chmod +x "$PROJECT_ROOT/manage-hooks.sh"
success "Hook management script created"

# Create .gitignore entries for hook-related files
log "Adding Git hook entries to .gitignore..."
GITIGNORE_FILE="$PROJECT_ROOT/.gitignore"

# Add entries if they don't exist
if [[ -f "$GITIGNORE_FILE" ]]; then
    if ! grep -q "# Git hooks backup" "$GITIGNORE_FILE"; then
        echo "" >> "$GITIGNORE_FILE"
        echo "# Git hooks backup" >> "$GITIGNORE_FILE"
        echo ".git/hooks/*.backup.*" >> "$GITIGNORE_FILE"
        echo ".git/hooks/*.disabled" >> "$GITIGNORE_FILE"
    fi
    
    if ! grep -q "# Build metadata" "$GITIGNORE_FILE"; then
        echo "" >> "$GITIGNORE_FILE"
        echo "# Build metadata" >> "$GITIGNORE_FILE"
        echo "build-info.json" >> "$GITIGNORE_FILE"
    fi
fi

# Test hooks
log "Testing hook installation..."
if [[ -x "$GIT_HOOKS_DIR/pre-commit" ]]; then
    success "Pre-commit hook is executable"
else
    error "Pre-commit hook is not executable"
fi

if [[ -x "$GIT_HOOKS_DIR/post-commit" ]]; then
    success "Post-commit hook is executable"
else
    error "Post-commit hook is not executable"
fi

# Show installed hooks
log "Installed Git hooks:"
ls -la "$GIT_HOOKS_DIR" | grep -v "\.sample" | grep -v "^total" || echo "No custom hooks found"

echo
success "Git hooks setup completed!"
echo
log "Available hooks:"
log "  pre-commit       - Runs quality checks before commits"
log "  post-commit      - Triggers builds after commits"
log "  prepare-commit-msg - Adds metadata to commit messages"
log "  commit-msg       - Validates commit message format"
echo
log "Hook management:"
log "  ./manage-hooks.sh enable   - Enable all hooks"
log "  ./manage-hooks.sh disable  - Disable all hooks"
log "  ./manage-hooks.sh status   - Show hook status"
echo
log "To temporarily skip hooks for a commit, use: git commit --no-verify"