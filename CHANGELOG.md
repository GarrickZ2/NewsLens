# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-05

### Added

- **Topic management** — create, archive, and recover topics with emoji, description, and cron schedule
- **AI-powered news fetch** — Claude Code agent runs on a cron schedule, searches the web, and reports structured findings
- **Event timeline** — dual view: Feed (flat, newest first) and Threads (grouped parent→child chains)
- **Checklist** — per-topic alert conditions evaluated by AI on every fetch
- **Focus points** — specific angles for the AI to prioritize during research
- **Notifications** — extensible hook system with system banners and Discord webhook support
- **Statistics** — per-topic and global run logs with token usage, cost, and duration tracking
- **Settings** — agent command, model, language, news sources, Discord webhooks, theme
- **Themes** — multiple dark/light color themes
- **Scheduler** — cron-based automatic fetch with per-topic loading state indicators
- **Archive** — archived topics with summary snapshots
- **GitHub Actions CI** — cargo fmt, clippy, TypeScript checks on push/PR
- **GitHub Actions Release** — automatic binary builds (macOS arm64 + x86_64) on version tags
