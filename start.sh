#!/bin/bash
cd "$(dirname "$0")"
source "$HOME/.cargo/env"
npm run tauri dev
