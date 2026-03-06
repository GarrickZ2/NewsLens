use crate::db::models::{Update, UpdateWithTopic};
use crate::db::queries::updates;
use crate::error::Result;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_updates(
    state: State<'_, AppState>,
    topic_id: String,
    limit: Option<u32>,
) -> Result<Vec<Update>> {
    updates::get_updates(&state.db, &topic_id, limit).await
}

#[tauri::command]
pub async fn get_all_recent_updates(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> Result<Vec<UpdateWithTopic>> {
    updates::get_all_recent_updates(&state.db, limit.unwrap_or(20)).await
}
