use crate::error::Result;
use tokio_rusqlite::Connection;

pub async fn init_db(path: &str) -> Result<Connection> {
    let conn = Connection::open(path).await?;

    conn.call(|conn| {
        // Enable WAL mode for better concurrent performance
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        // Run migrations
        conn.execute_batch(SCHEMA_V1)?;

        // Idempotent column migrations
        conn.execute_batch("ALTER TABLE topics ADD COLUMN summary TEXT")
            .ok();
        conn.execute_batch("ALTER TABLE topics ADD COLUMN summary_updated_at TEXT")
            .ok();

        // News events table
        conn.execute_batch(NEWS_EVENTS_TABLE)?;

        // Idempotent column migration for occurred_at
        conn.execute_batch("ALTER TABLE news_events ADD COLUMN occurred_at TEXT")
            .ok();

        // Fetch run logs table
        conn.execute_batch(FETCH_RUN_LOGS_TABLE)?;

        // Idempotent: add cost_usd to existing fetch_run_logs tables
        conn.execute_batch("ALTER TABLE fetch_run_logs ADD COLUMN cost_usd REAL DEFAULT 0")
            .ok();

        // Market symbols table
        conn.execute_batch(MARKET_SYMBOLS_TABLE)?;

        // Idempotent: add reason column to topic_market_symbols
        conn.execute_batch("ALTER TABLE topic_market_symbols ADD COLUMN reason TEXT")
            .ok();

        // New settings keys (idempotent)
        conn.execute_batch("INSERT OR IGNORE INTO settings VALUES ('news_sources', '')")
            .ok();
        conn.execute_batch("INSERT OR IGNORE INTO settings VALUES ('language', 'English')")
            .ok();
        conn.execute_batch("INSERT OR IGNORE INTO settings VALUES ('discord_webhooks', '[]')")
            .ok();

        Ok(())
    })
    .await?;

    Ok(conn)
}

const SCHEMA_V1: &str = r#"
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '📰',
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
    cron_schedule TEXT NOT NULL DEFAULT 'every_3h',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT,
    archive_summary TEXT
);

CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    triggered INTEGER NOT NULL DEFAULT 0,
    triggered_at TEXT,
    summary TEXT,
    impact TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_checklist_topic ON checklist_items(topic_id);

CREATE TABLE IF NOT EXISTS focus_points (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','ai')),
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_focus_topic ON focus_points(topic_id);

CREATE TABLE IF NOT EXISTS updates (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    no_change INTEGER NOT NULL DEFAULT 0,
    sources TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_updates_topic_time ON updates(topic_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user','ai')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_topic ON chat_messages(topic_id);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings VALUES
    ('default_frequency', 'every_3h'),
    ('notifications_enabled', 'true'),
    ('db_version', '1'),
    ('agent_command', 'claude'),
    ('agent_model', 'claude-sonnet-4-6'),
    ('brave_api_key', '');
"#;

const FETCH_RUN_LOGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS fetch_run_logs (
    id            TEXT PRIMARY KEY,
    topic_id      TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    ai_mode       TEXT NOT NULL,
    model_name    TEXT NOT NULL DEFAULT '',
    input_tokens  INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    duration_ms   INTEGER NOT NULL DEFAULT 0,
    no_change     INTEGER NOT NULL DEFAULT 0,
    events_count  INTEGER NOT NULL DEFAULT 0,
    cost_usd      REAL NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_run_logs_topic ON fetch_run_logs(topic_id, created_at DESC);
"#;

const MARKET_SYMBOLS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS topic_market_symbols (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL DEFAULT 'stock',
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE(topic_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_market_symbols_topic ON topic_market_symbols(topic_id);
"#;

const NEWS_EVENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS news_events (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'new',
    status TEXT NOT NULL DEFAULT 'active',
    summary TEXT NOT NULL,
    sources TEXT NOT NULL DEFAULT '[]',
    parent_event_id TEXT,
    first_seen_at TEXT NOT NULL,
    last_updated_at TEXT NOT NULL,
    occurred_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_topic ON news_events(topic_id, first_seen_at DESC);
"#;
