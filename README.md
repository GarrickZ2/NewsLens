# NewsLens

**Turn your Claude Code into a News Agent.**

[![GitHub Release](https://img.shields.io/github/v/release/GarrickZ2/NewsLens?style=flat)](https://github.com/GarrickZ2/NewsLens/releases/latest)
[![Rust](https://img.shields.io/badge/rust-1.75+-orange.svg)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)]()

Define a topic, set a schedule — NewsLens sends Claude Code to the web, surfaces what changed, and notifies you. No manual searching, no tab overload.

---

## Quick Start

```bash
brew tap shuo-han/newslens https://github.com/Shuo-Han/NewsLens
brew install --cask newslens
```

Then launch:

```bash
newslens
```

A native desktop window opens. Configure your `claude` agent in Settings and create your first topic.

---

## How It Works

NewsLens runs Claude Code as a news research agent on a cron schedule. Each run:

1. Claude Code searches the web for the latest developments on your topic
2. New events are classified as **New**, **Escalation**, or **Resolution**
3. You get a desktop notification (and optionally a Discord message)
4. Everything is stored locally — browse the timeline anytime

---

## Topics

Each topic is an independent news monitor. Configure:

- **Description** — what to track and what matters
- **Schedule** — cron expression (`0 */6 * * *` = every 6 hours)
- **Focus Points** — specific angles for Claude to pay attention to
- **Checklist** — alert conditions ("ceasefire announced", "stock drops below $100")

When a checklist item triggers, you get an immediate notification.

---

## Event Timeline

Events are stored as a thread graph. Each **New** event can spawn **Escalation** or **Resolution** children, forming a narrative chain.

Two views:

- **Feed** — flat timeline, newest first
- **Threads** — grouped chains, click any thread to trace the full arc from first report to resolution

---

## Notifications

Notifications fire on every successful fetch. Built-in channels:

| Channel | Trigger |
|---------|---------|
| **System banner** | New events found |
| **Discord webhook** | New events found (rich embed, color-coded by severity) |

Add as many Discord webhooks as you want — useful for routing different topics to different channels.

---

## Statistics

Every AI run is logged: tokens in/out, duration, cost, event count. View per-topic history or a global breakdown across all topics.

Cost is reported directly from Claude Code's output and stored per run.

---

## Install

**Homebrew (recommended):**

```bash
brew tap shuo-han/newslens https://github.com/Shuo-Han/NewsLens
brew install --cask newslens

# Upgrade
brew upgrade --cask newslens
```

**Shell** (auto-detects arm64 / x86_64):

```bash
curl -sSL https://raw.githubusercontent.com/GarrickZ2/NewsLens/main/install.sh | sh

# Custom install path (default: /usr/local/bin)
curl -sSL https://raw.githubusercontent.com/GarrickZ2/NewsLens/main/install.sh | INSTALL_DIR=~/.local/bin sh
```

**From source:**

```bash
git clone https://github.com/GarrickZ2/NewsLens.git
cd NewsLens
npm install && npm run build
cd src-tauri && cargo build --release
cp target/release/newslens /usr/local/bin/
```

---

## Requirements

- macOS 12+
- [`claude`](https://claude.ai/code) CLI installed and authenticated
- Brave Search API key (optional, for web search via MCP)

## License

MIT
