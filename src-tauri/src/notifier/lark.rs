use super::{FetchEvent, NotificationHook};
use async_trait::async_trait;
use serde_json::{json, Value};

/// Sends interactive card messages to one or more Lark (Feishu) group bot webhook URLs
pub struct LarkHook {
    pub webhook_urls: Vec<String>,
}

impl LarkHook {
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
impl NotificationHook for LarkHook {
    async fn on_fetch(&self, event: &FetchEvent) {
        if self.webhook_urls.is_empty() {
            return;
        }

        match event {
            FetchEvent::Success { topic, events } => {
                if events.is_empty() {
                    return;
                }

                let header_title = format!(
                    "{} {} · {} new update{}",
                    topic.emoji,
                    topic.name,
                    events.len(),
                    if events.len() == 1 { "" } else { "s" }
                );

                // Build event lines as lark_md
                let mut lines: Vec<String> = events
                    .iter()
                    .take(10)
                    .map(|ev| {
                        let icon = event_icon(&ev.event_type);
                        format!("{} **{}**\n{}", icon, ev.title, truncate(&ev.summary, 200))
                    })
                    .collect();

                if events.len() > 10 {
                    lines.push(format!(
                        "_… and {} more. Open NewsLens to see all._",
                        events.len() - 10
                    ));
                }

                let body_text = lines.join("\n\n");

                // Determine header color template
                let template = dominant_template(events);

                let payload = json!({
                    "msg_type": "interactive",
                    "card": {
                        "config": {"wide_screen_mode": true},
                        "header": {
                            "title": {"tag": "plain_text", "content": header_title},
                            "template": template
                        },
                        "elements": [
                            {
                                "tag": "div",
                                "text": {"tag": "lark_md", "content": body_text}
                            },
                            {
                                "tag": "hr"
                            },
                            {
                                "tag": "note",
                                "elements": [{"tag": "plain_text", "content": "Sent by NewsLens"}]
                            }
                        ]
                    }
                });

                self.post(payload).await;
            }

            FetchEvent::Failure { topic, error } => {
                let text = format!(
                    "❌ **Fetch failed** — {} {}\n{}",
                    topic.emoji,
                    topic.name,
                    truncate(error, 500)
                );
                let payload = json!({
                    "msg_type": "interactive",
                    "card": {
                        "config": {"wide_screen_mode": true},
                        "header": {
                            "title": {"tag": "plain_text", "content": "NewsLens — Fetch Failed"},
                            "template": "red"
                        },
                        "elements": [
                            {"tag": "div", "text": {"tag": "lark_md", "content": text}},
                            {"tag": "hr"},
                            {"tag": "note", "elements": [{"tag": "plain_text", "content": "Sent by NewsLens"}]}
                        ]
                    }
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

fn dominant_template(events: &[super::EventSummary]) -> &'static str {
    if events.iter().any(|e| e.event_type == "escalation") {
        "orange"
    } else if events.iter().any(|e| e.event_type == "resolution") {
        "green"
    } else {
        "blue"
    }
}

fn truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(max_chars - 1).collect::<String>())
    }
}
