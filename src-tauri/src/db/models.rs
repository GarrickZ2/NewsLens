use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Topic {
    pub id: String,
    pub name: String,
    pub emoji: String,
    pub description: String,
    pub status: String,
    pub cron_schedule: String,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,
    pub archive_summary: Option<String>,
    pub summary: Option<String>,
    pub summary_updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsEvent {
    pub id: String,
    pub topic_id: String,
    pub title: String,
    pub event_type: String, // "new" | "escalation" | "resolution"
    pub status: String,     // "active" | "resolved"
    pub summary: String,
    pub sources: Vec<Source>,
    pub parent_event_id: Option<String>,
    pub first_seen_at: String,
    pub last_updated_at: String,
    pub occurred_at: Option<String>, // Real-world time the event actually occurred
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistItem {
    pub id: String,
    pub topic_id: String,
    pub text: String,
    pub triggered: bool,
    pub triggered_at: Option<String>,
    pub summary: Option<String>,
    pub impact: Option<String>,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusPoint {
    pub id: String,
    pub topic_id: String,
    pub text: String,
    pub source: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Update {
    pub id: String,
    pub topic_id: String,
    pub content: String,
    pub no_change: bool,
    pub sources: Vec<Source>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWithTopic {
    #[serde(flatten)]
    pub update: Update,
    #[serde(rename = "topicName")]
    pub topic_name: String,
    #[serde(rename = "topicEmoji")]
    pub topic_emoji: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub default_frequency: String,
    pub notifications_enabled: bool,
    pub db_version: String,
    pub agent_command: String,    // e.g. "claude"
    pub agent_model: String,      // e.g. "claude-sonnet-4-6"
    pub brave_api_key: String,    // optional, for Brave Search MCP
    pub news_sources: String,     // comma-separated, empty = all sources
    pub language: String,         // output language, default "English"
    pub discord_webhooks: String, // JSON array of webhook URLs, e.g. ["https://..."]
    pub slack_webhooks: String,   // JSON array of webhook URLs
    pub lark_webhooks: String,    // JSON array of webhook URLs
    pub telegram_bots: String,    // JSON array of {token, chatId} objects
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchRunLog {
    pub id: String,
    pub topic_id: String,
    pub ai_mode: String,
    pub model_name: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub duration_ms: i64,
    pub no_change: bool,
    pub events_count: i64,
    pub cost_usd: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicRunStats {
    pub topic_id: String,
    pub topic_name: String,
    pub topic_emoji: String,
    pub topic_status: String, // "active" | "archived"
    pub tracking_since: String,
    pub total_runs: i64,
    pub total_input_tokens: i64,
    pub total_output_tokens: i64,
    pub total_duration_ms: i64,
    pub runs_with_events: i64,
    pub event_count: i64,
    pub total_cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalStats {
    pub topics: Vec<TopicRunStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicMarketSymbol {
    pub id: String,
    pub topic_id: String,
    pub symbol: String,
    pub name: String,
    pub asset_type: String, // "stock" | "etf" | "crypto"
    pub sort_order: i64,
    pub updated_at: String,
    pub reason: Option<String>,
}

// Input types for creating/updating
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTopicInput {
    pub name: String,
    pub emoji: Option<String>,
    pub description: String,
    pub cron_schedule: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTopicInput {
    pub name: Option<String>,
    pub emoji: Option<String>,
    pub description: Option<String>,
    pub cron_schedule: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerStatus {
    pub topic_id: String,
    pub is_running: bool,
    pub next_run: Option<String>,
    pub last_run: Option<String>,
}
