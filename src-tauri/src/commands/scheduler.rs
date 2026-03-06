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

    // 查每个 topic 最近一次 run log 的时间
    let topic_ids: Vec<String> = scheduler.jobs.keys().cloned().collect();
    drop(scheduler); // 释放锁，避免 DB 查询时持有

    let db = state.db.clone();
    let last_runs: HashMap<String, String> = db
        .call(move |conn| {
            let mut map = HashMap::new();
            for tid in &topic_ids {
                let result: rusqlite::Result<String> = conn.query_row(
                    "SELECT created_at FROM fetch_run_logs WHERE topic_id = ?1 ORDER BY created_at DESC LIMIT 1",
                    rusqlite::params![tid],
                    |row| row.get(0),
                );
                if let Ok(ts) = result {
                    map.insert(tid.clone(), ts);
                }
            }
            Ok(map)
        })
        .await
        .unwrap_or_default();

    let scheduler = state.scheduler.lock().await;
    let result: HashMap<String, SchedulerStatus> = scheduler
        .jobs
        .keys()
        .map(|topic_id| {
            let next_run = next_runs.get(topic_id).and_then(|v| v.clone());
            let last_run = last_runs.get(topic_id).cloned();
            let s = SchedulerStatus {
                topic_id: topic_id.clone(),
                is_running: false,
                next_run,
                last_run,
            };
            (topic_id.clone(), s)
        })
        .collect();
    Ok(result)
}
