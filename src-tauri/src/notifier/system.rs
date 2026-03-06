use super::{FetchEvent, NotificationHook};
use async_trait::async_trait;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Sends macOS / system-level banner notifications
pub struct SystemNotifyHook {
    pub app: AppHandle,
    pub enabled: bool,
}

#[async_trait]
impl NotificationHook for SystemNotifyHook {
    async fn on_fetch(&self, event: &FetchEvent) {
        if !self.enabled {
            return;
        }
        match event {
            FetchEvent::Success { topic, events } => {
                let n = events.len();
                if n == 0 {
                    return;
                }
                let body = if n == 1 {
                    "1 new update".to_string()
                } else {
                    format!("{} new updates", n)
                };
                let _ = self
                    .app
                    .notification()
                    .builder()
                    .title(format!("{} {}", topic.emoji, topic.name))
                    .body(&body)
                    .show();
            }
            FetchEvent::Failure { topic, error } => {
                let _ = self
                    .app
                    .notification()
                    .builder()
                    .title(format!("Fetch failed — {}", topic.name))
                    .body(error)
                    .show();
            }
            FetchEvent::NoChange => {}
        }
    }
}
