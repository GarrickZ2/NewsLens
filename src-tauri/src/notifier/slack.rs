use super::{FetchEvent, NotificationHook};
use async_trait::async_trait;
use serde_json::{json, Value};

/// Sends messages to one or more Slack Incoming Webhook URLs
pub struct SlackHook {
    pub webhook_urls: Vec<String>,
}

impl SlackHook {
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
impl NotificationHook for SlackHook {
    async fn on_fetch(&self, event: &FetchEvent) {
        if self.webhook_urls.is_empty() {
            return;
        }

        match event {
            FetchEvent::Success { topic, events } => {
                if events.is_empty() {
                    return;
                }

                let header = format!(
                    "{} {} · {} new update{}",
                    topic.emoji,
                    topic.name,
                    events.len(),
                    if events.len() == 1 { "" } else { "s" }
                );

                let mut blocks: Vec<Value> = vec![
                    json!({
                        "type": "header",
                        "text": {"type": "plain_text", "text": header, "emoji": true}
                    }),
                    json!({"type": "divider"}),
                ];

                for ev in events.iter().take(10) {
                    let icon = event_icon(&ev.event_type);
                    let text = format!("{} *{}*\n{}", icon, ev.title, truncate(&ev.summary, 200));
                    blocks.push(json!({
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": text}
                    }));
                }

                if events.len() > 10 {
                    blocks.push(json!({
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": format!("_… and {} more. Open NewsLens to see all._", events.len() - 10)
                        }
                    }));
                }

                blocks.push(json!({
                    "type": "context",
                    "elements": [{"type": "mrkdwn", "text": "Sent by *NewsLens*"}]
                }));

                self.post(json!({"blocks": blocks})).await;
            }

            FetchEvent::Failure { topic, error } => {
                let text = format!(
                    ":x: *Fetch failed* — {} {}\n```{}```",
                    topic.emoji,
                    topic.name,
                    truncate(error, 500)
                );
                self.post(json!({
                    "blocks": [
                        {"type": "section", "text": {"type": "mrkdwn", "text": text}},
                        {"type": "context", "elements": [{"type": "mrkdwn", "text": "Sent by *NewsLens*"}]}
                    ]
                }))
                .await;
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

fn truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(max_chars - 1).collect::<String>())
    }
}
