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
