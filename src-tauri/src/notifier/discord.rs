use super::{EventSummary, FetchEvent, NotificationHook};
use async_trait::async_trait;
use serde_json::{json, Value};

// Discord embed colors (decimal)
const COLOR_NEW: u32 = 0x5865F2; // Discord blurple
const COLOR_ESCALATION: u32 = 0xf97316; // orange
const COLOR_RESOLUTION: u32 = 0x22c55e; // green
const COLOR_FAILURE: u32 = 0xef4444; // red

/// Sends rich embed messages to one or more Discord webhook URLs
pub struct DiscordHook {
    pub webhook_urls: Vec<String>,
}

impl DiscordHook {
    pub fn new(webhook_urls: Vec<String>) -> Self {
        Self {
            webhook_urls: webhook_urls
                .into_iter()
                .filter(|u| !u.trim().is_empty())
                .collect(),
        }
    }

    async fn post(&self, body: Value) {
        let client = reqwest::Client::new();
        for url in &self.webhook_urls {
            let _ = client.post(url).json(&body).send().await;
        }
    }
}

#[async_trait]
impl NotificationHook for DiscordHook {
    async fn on_fetch(&self, event: &FetchEvent) {
        if self.webhook_urls.is_empty() {
            return;
        }

        let now = chrono::Utc::now().to_rfc3339();

        match event {
            FetchEvent::Success { topic, events } => {
                if events.is_empty() {
                    return;
                }

                let color = dominant_color(events);
                let title = format!(
                    "{} new update{}",
                    events.len(),
                    if events.len() == 1 { "" } else { "s" }
                );

                // Build embed fields (max 10 events shown)
                let fields: Vec<Value> = events
                    .iter()
                    .take(10)
                    .map(|ev| {
                        let icon = event_icon(&ev.event_type);
                        let summary = truncate(&ev.summary, 200);
                        json!({
                            "name": format!("{} {}", icon, ev.title),
                            "value": summary,
                            "inline": false
                        })
                    })
                    .collect();

                let mut all_fields = fields;
                if events.len() > 10 {
                    all_fields.push(json!({
                        "name": format!("… and {} more", events.len() - 10),
                        "value": "Open NewsLens to see all updates.",
                        "inline": false
                    }));
                }

                let payload = json!({
                    "username": "NewsLens",
                    "embeds": [{
                        "author": {
                            "name": format!("{} {}", topic.emoji, topic.name)
                        },
                        "title": title,
                        "color": color,
                        "fields": all_fields,
                        "footer": { "text": "NewsLens" },
                        "timestamp": now
                    }]
                });

                self.post(payload).await;
            }

            FetchEvent::Failure { topic, error } => {
                let payload = json!({
                    "username": "NewsLens",
                    "embeds": [{
                        "title": "Fetch failed",
                        "description": format!("{} **{}**\n```\n{}\n```", topic.emoji, topic.name, truncate(error, 500)),
                        "color": COLOR_FAILURE,
                        "footer": { "text": "NewsLens" },
                        "timestamp": now
                    }]
                });

                self.post(payload).await;
            }

            FetchEvent::NoChange => {}
        }
    }
}

fn event_icon(event_type: &str) -> &'static str {
    match event_type {
        "escalation" => "🟠",
        "resolution" => "🟢",
        _ => "🔵",
    }
}

fn dominant_color(events: &[EventSummary]) -> u32 {
    // Use the color of the most "severe" event type present
    if events.iter().any(|e| e.event_type == "escalation") {
        COLOR_ESCALATION
    } else if events.iter().any(|e| e.event_type == "resolution") {
        COLOR_RESOLUTION
    } else {
        COLOR_NEW
    }
}

fn truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(max_chars - 1).collect::<String>())
    }
}
