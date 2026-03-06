use crate::db::models::FocusPoint;
use crate::db::queries::focus_points;
use crate::error::Result;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_focus_points(
    state: State<'_, AppState>,
    topic_id: String,
) -> Result<Vec<FocusPoint>> {
    focus_points::get_focus_points(&state.db, &topic_id).await
}

#[tauri::command]
pub async fn add_focus_point(
    state: State<'_, AppState>,
    topic_id: String,
    text: String,
    source: Option<String>,
) -> Result<FocusPoint> {
    let source = source.unwrap_or_else(|| "manual".to_string());
    focus_points::add_focus_point(&state.db, &topic_id, &text, &source).await
}

#[tauri::command]
pub async fn delete_focus_point(state: State<'_, AppState>, id: String) -> Result<()> {
    focus_points::delete_focus_point(&state.db, &id).await
}
