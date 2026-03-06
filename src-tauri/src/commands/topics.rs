use crate::db::models::{CreateTopicInput, Topic, UpdateTopicInput};
use crate::db::queries::topics;
use crate::error::Result;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_topics(state: State<'_, AppState>) -> Result<Vec<Topic>> {
    topics::get_all_topics(&state.db).await
}

#[tauri::command]
pub async fn get_topic(state: State<'_, AppState>, id: String) -> Result<Topic> {
    topics::get_topic(&state.db, &id).await
}

#[tauri::command]
pub async fn create_topic(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    input: CreateTopicInput,
) -> Result<Topic> {
    let cron = input
        .cron_schedule
        .clone()
        .unwrap_or_else(|| "every_3h".to_string());
    let topic = topics::create_topic(&state.db, input).await?;

    // Register scheduler job
    {
        let mut scheduler = state.scheduler.lock().await;
        let _ = scheduler
            .add_topic_job(topic.id.clone(), &cron, app, state.db.clone())
            .await;
    }

    Ok(topic)
}

#[tauri::command]
pub async fn update_topic(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    input: UpdateTopicInput,
) -> Result<Topic> {
    let topic = topics::update_topic(&state.db, &id, input).await?;

    // Re-register scheduler job if schedule changed
    {
        let mut scheduler = state.scheduler.lock().await;
        let _ = scheduler
            .add_topic_job(
                topic.id.clone(),
                &topic.cron_schedule,
                app,
                state.db.clone(),
            )
            .await;
    }

    Ok(topic)
}

#[tauri::command]
pub async fn archive_topic(state: State<'_, AppState>, id: String) -> Result<Topic> {
    // Remove scheduler job
    {
        let mut scheduler = state.scheduler.lock().await;
        let _ = scheduler.remove_topic_job(&id).await;
    }

    topics::archive_topic(&state.db, &id, None).await
}

#[tauri::command]
pub async fn recover_topic(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<Topic> {
    let topic = topics::recover_topic(&state.db, &id).await?;
    {
        let mut scheduler = state.scheduler.lock().await;
        let _ = scheduler
            .add_topic_job(
                topic.id.clone(),
                &topic.cron_schedule,
                app,
                state.db.clone(),
            )
            .await;
    }
    Ok(topic)
}

#[tauri::command]
pub async fn delete_topic(state: State<'_, AppState>, id: String) -> Result<()> {
    // Remove scheduler job
    {
        let mut scheduler = state.scheduler.lock().await;
        let _ = scheduler.remove_topic_job(&id).await;
    }

    topics::delete_topic(&state.db, &id).await
}

