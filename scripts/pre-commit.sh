#!/bin/sh
set -e

cd "$(git rev-parse --show-toplevel)/src-tauri"

echo "▶ cargo fmt --check"
cargo fmt --all -- --check

echo "▶ cargo clippy"
cargo clippy -- -D warnings

echo "✓ pre-commit passed"
