use crate::ai::chat::send_chat_message;
use crate::ai::client::AnthropicClient;
use crate::db::models::ChatMessage;
use crate::db::queries::{
    chat_messages::{get_chat_messages, save_message},
    checklist::get_checklist_items,
    focus_points::get_focus_points,
    settings::get_settings,
    topics::get_topic,
    updates::get_updates,
};
use crate::error::{AppError, Result};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_chat_messages_cmd(
    state: State<'_, AppState>,
    topic_id: String,
) -> Result<Vec<ChatMessage>> {
    get_chat_messages(&state.db, &topic_id).await
}

#[tauri::command]
pub async fn send_chat_message_cmd(
    state: State<'_, AppState>,
    topic_id: String,
    content: String,
) -> Result<ChatMessage> {
    let settings = get_settings(&state.db).await?;
    if settings.api_key.is_empty() {
        return Err(AppError::Ai(
            "API key not configured. Please add your API key in Settings.".to_string(),
        ));
    }

    // Save user message first
    save_message(&state.db, &topic_id, "user", &content).await?;

    // Fetch context
    let topic = get_topic(&state.db, &topic_id).await?;
    let focus_points = get_focus_points(&state.db, &topic_id).await?;
    let checklist_items = get_checklist_items(&state.db, &topic_id).await?;
    let recent_updates = get_updates(&state.db, &topic_id, Some(5)).await?;
    let history = get_chat_messages(&state.db, &topic_id).await?;

    let client = AnthropicClient::new(settings.api_key, settings.model);
    let ai_text = send_chat_message(
        &client,
        &topic,
        &focus_points,
        &checklist_items,
        &recent_updates,
        &history,
        &content,
    )
    .await?;

    // Save AI response
    let ai_msg = save_message(&state.db, &topic_id, "ai", &ai_text).await?;
    Ok(ai_msg)
}
