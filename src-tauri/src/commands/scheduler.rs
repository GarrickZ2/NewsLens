use crate::db::models::SchedulerStatus;
use crate::error::Result;
use crate::scheduler::job::execute_fetch_job;
use crate::state::AppState;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub async fn trigger_fetch(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    topic_id: String,
) -> Result<()> {
    let db = state.db.clone();
    tokio::spawn(execute_fetch_job(app, db, topic_id));
    Ok(())
}

#[tauri::command]
pub async fn get_scheduler_status(
    state: State<'_, AppState>,
) -> Result<HashMap<String, SchedulerStatus>> {
    let scheduler = state.scheduler.lock().await;
    let next_runs = scheduler.get_next_run_times();
    let result: HashMap<String, SchedulerStatus> = scheduler
        .jobs
        .keys()
        .map(|topic_id| {
            let next_run = next_runs.get(topic_id).and_then(|v| v.clone());
            let s = SchedulerStatus {
                topic_id: topic_id.clone(),
                is_running: false,
                next_run,
                last_run: None,
            };
            (topic_id.clone(), s)
        })
        .collect();
    Ok(result)
}
