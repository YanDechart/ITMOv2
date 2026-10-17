#!/usr/bin/env bash

# Practice 4 — Automatic verification
# Runs the complete unittest suite for Practice 4.

set -euo pipefail

# Resolve the Practice 4 directory relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRACTICE_DIR="${SCRIPT_DIR%/scripts}"

echo "[check] Running tests in: $PRACTICE_DIR"

python3 -m unittest discover -s "$PRACTICE_DIR" -p 'test*.py'

echo "[check] PASS"
