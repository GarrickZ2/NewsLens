mod discord;
mod system;
pub use discord::DiscordHook;
pub use system::SystemNotifyHook;

use async_trait::async_trait;

/// Lightweight event data for each fetched news event, used by notification hooks
#[derive(Debug, Clone)]
pub struct EventSummary {
    pub title: String,
    pub event_type: String, // "new" | "escalation" | "resolution"
    pub summary: String,
}

/// Information about the topic that triggered the fetch
#[derive(Debug, Clone)]
pub struct TopicInfo {
    #[allow(dead_code)]
    pub id: String,
    pub name: String,
    pub emoji: String,
}

/// The outcome of a fetch job — passed to every registered hook
#[derive(Debug, Clone)]
pub enum FetchEvent {
    /// AI ran and found new events
    Success {
        topic: TopicInfo,
        events: Vec<EventSummary>,
    },
    /// AI ran but found no changes worth reporting
    NoChange,
    /// The fetch or AI call failed
    Failure { topic: TopicInfo, error: String },
}

/// Implement this trait to add a new notification channel (system, Discord, Slack, …)
#[async_trait]
pub trait NotificationHook: Send + Sync {
    async fn on_fetch(&self, event: &FetchEvent);
}

/// Drives all registered hooks for a fetch job
pub struct HookEngine {
    hooks: Vec<Box<dyn NotificationHook>>,
}

impl HookEngine {
    pub fn new() -> Self {
        Self { hooks: Vec::new() }
    }

    /// Builder-style registration
    pub fn register(mut self, hook: impl NotificationHook + 'static) -> Self {
        self.hooks.push(Box::new(hook));
        self
    }

    /// Dispatch the event to every registered hook in order
    pub async fn dispatch(&self, event: &FetchEvent) {
        for hook in &self.hooks {
            hook.on_fetch(event).await;
        }
    }
}
