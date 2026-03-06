use crate::db::models::NewsEvent;
use crate::db::queries::news_events::get_news_events;
use crate::error::Result;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_news_events_cmd(
    state: State<'_, AppState>,
    topic_id: String,
) -> Result<Vec<NewsEvent>> {
    get_news_events(&state.db, &topic_id).await
}
