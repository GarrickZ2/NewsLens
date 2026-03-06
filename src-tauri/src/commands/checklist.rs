use crate::db::models::ChecklistItem;
use crate::db::queries::checklist;
use crate::error::Result;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_checklist_items(
    state: State<'_, AppState>,
    topic_id: String,
) -> Result<Vec<ChecklistItem>> {
    checklist::get_checklist_items(&state.db, &topic_id).await
}

#[tauri::command]
pub async fn add_checklist_item(
    state: State<'_, AppState>,
    topic_id: String,
    text: String,
) -> Result<ChecklistItem> {
    checklist::add_checklist_item(&state.db, &topic_id, &text).await
}

#[tauri::command]
pub async fn reorder_checklist_items(
    state: State<'_, AppState>,
    topic_id: String,
    ids: Vec<String>,
) -> Result<()> {
    checklist::reorder_checklist_items(&state.db, &topic_id, ids).await
}

#[tauri::command]
pub async fn delete_checklist_item(state: State<'_, AppState>, id: String) -> Result<()> {
    checklist::delete_checklist_item(&state.db, &id).await
}
