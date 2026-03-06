use crate::db::models::Settings;
use crate::db::queries::settings::{get_settings, update_settings};
use crate::error::Result;
use crate::state::AppState;
use serde::Deserialize;
use tauri::State;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartialSettings {
    pub default_frequency: Option<String>,
    pub notifications_enabled: Option<bool>,
    pub agent_command: Option<String>,
    pub agent_model: Option<String>,
    pub brave_api_key: Option<String>,
    pub news_sources: Option<String>,
    pub language: Option<String>,
    pub discord_webhooks: Option<String>,
}

#[tauri::command]
pub async fn get_settings_cmd(state: State<'_, AppState>) -> Result<Settings> {
    get_settings(&state.db).await
}

#[tauri::command]
pub async fn update_settings_cmd(
    state: State<'_, AppState>,
    input: PartialSettings,
) -> Result<Settings> {
    let mut updates = Vec::new();

    if let Some(freq) = input.default_frequency {
        updates.push(("default_frequency".to_string(), freq));
    }
    if let Some(notif) = input.notifications_enabled {
        updates.push((
            "notifications_enabled".to_string(),
            if notif { "true" } else { "false" }.to_string(),
        ));
    }
    if let Some(agent_command) = input.agent_command {
        updates.push(("agent_command".to_string(), agent_command));
    }
    if let Some(agent_model) = input.agent_model {
        updates.push(("agent_model".to_string(), agent_model));
    }
    if let Some(brave_api_key) = input.brave_api_key {
        updates.push(("brave_api_key".to_string(), brave_api_key));
    }
    if let Some(news_sources) = input.news_sources {
        updates.push(("news_sources".to_string(), news_sources));
    }
    if let Some(language) = input.language {
        updates.push(("language".to_string(), language));
    }
    if let Some(discord_webhooks) = input.discord_webhooks {
        updates.push(("discord_webhooks".to_string(), discord_webhooks));
    }

    update_settings(&state.db, updates).await
}
