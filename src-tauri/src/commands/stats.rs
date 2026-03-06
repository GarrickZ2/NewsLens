use crate::db::models::{FetchRunLog, GlobalStats};
use crate::db::queries::run_logs::{get_global_stats, get_topic_run_logs};
use crate::error::Result;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_topic_run_logs_cmd(
    state: State<'_, AppState>,
    topic_id: String,
    limit: Option<i64>,
) -> Result<Vec<FetchRunLog>> {
    get_topic_run_logs(&state.db, &topic_id, limit.unwrap_or(50)).await
}

#[tauri::command]
pub async fn get_global_stats_cmd(
    state: State<'_, AppState>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<GlobalStats> {
    get_global_stats(&state.db, start_date, end_date).await
}
