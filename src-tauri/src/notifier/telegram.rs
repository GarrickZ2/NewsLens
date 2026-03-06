use super::{FetchEvent, NotificationHook};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// A single Telegram bot + chat pair
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelegramBot {
    pub token: String,
    #[serde(rename = "chatId")]
    pub chat_id: String,
}

/// Sends HTML messages via one or more Telegram bots
pub struct TelegramHook {
    pub bots: Vec<TelegramBot>,
}

impl TelegramHook {
    pub fn new(bots: Vec<TelegramBot>) -> Self {
        Self {
            bots: bots
                .into_iter()
                .filter(|b| !b.token.trim().is_empty() && !b.chat_id.trim().is_empty())
                .collect(),
        }
    }

    async fn send(&self, text: &str) {
        let client = reqwest::Client::new();
        for bot in &self.bots {
            let url = format!("https://api.telegram.org/bot{}/sendMessage", bot.token);
            let _ = client
                .post(&url)
                .json(&serde_json::json!({
                    "chat_id": bot.chat_id,
                    "text": text,
                    "parse_mode": "HTML"
                }))
                .send()
                .await;
        }
    }
}

#[async_trait]
impl NotificationHook for TelegramHook {
    async fn on_fetch(&self, event: &FetchEvent) {
        if self.bots.is_empty() {
            return;
        }

        match event {
            FetchEvent::Success { topic, events } => {
                if events.is_empty() {
                    return;
                }

                let header = format!(
                    "<b>{} {}</b> · {} new update{}",
                    escape_html(&topic.emoji),
                    escape_html(&topic.name),
                    events.len(),
                    if events.len() == 1 { "" } else { "s" }
                );

                let event_lines: Vec<String> = events
                    .iter()
                    .take(10)
                    .map(|ev| {
                        let icon = event_icon(&ev.event_type);
                        format!(
                            "{} <b>{}</b>\n{}",
                            icon,
                            escape_html(&ev.title),
                            escape_html(&truncate(&ev.summary, 200))
                        )
                    })
                    .collect();

                let mut parts = vec![header];
                parts.push(String::new());
                parts.extend(event_lines);

                if events.len() > 10 {
                    parts.push(format!(
                        "<i>… and {} more. Open NewsLens to see all.</i>",
                        events.len() - 10
                    ));
                }

                parts.push(String::new());
                parts.push("<i>Sent by NewsLens</i>".to_string());

                self.send(&parts.join("\n")).await;
            }

            FetchEvent::Failure { topic, error } => {
                let text = format!(
                    "❌ <b>Fetch failed</b> — {} {}\n<code>{}</code>\n\n<i>Sent by NewsLens</i>",
                    escape_html(&topic.emoji),
                    escape_html(&topic.name),
                    escape_html(&truncate(error, 500))
                );
                self.send(&text).await;
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

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(max_chars - 1).collect::<String>())
    }
}
