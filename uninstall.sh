#!/bin/bash
set -e

# Directory guard: refuse to run outside the usdd-skills project root.
if [ ! -f package.json ] || ! grep -q '"name": "@usdd/usdd-skills"' package.json; then
    echo "Error: uninstall.sh must be run from the usdd-skills project root."
    echo "  (Current directory: $(pwd))"
    exit 1
fi

echo "Removing node_modules and .env..."
rm -rf node_modules .env
echo "Done. To fully remove, delete this directory."
