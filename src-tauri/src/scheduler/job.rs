use crate::ai::agent::run_fetch_job_agent;
use crate::ai::client::AnthropicClient;
use crate::ai::fetch_job::{run_fetch_job, FetchContext};
use crate::db::queries::{
    checklist::get_checklist_items,
    checklist::update_checklist_item_triggered,
    focus_points::get_focus_points,
    news_events::{create_news_event, get_active_events, update_news_event, NewEventInput},
    run_logs::{create_run_log, RunLogInput},
    settings::get_settings,
    topics::{get_topic, update_topic_summary},
    updates::create_update,
};
use crate::notifier::{
    DiscordHook, EventSummary, FetchEvent, HookEngine, SystemNotifyHook, TopicInfo,
};
use serde::Serialize;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use tokio_rusqlite::Connection;

#[derive(Debug, Clone, Serialize)]
pub struct FetchJobStartedPayload {
    #[serde(rename = "topicId")]
    pub topic_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct FetchJobCompletedPayload {
    #[serde(rename = "topicId")]
    pub topic_id: String,
    #[serde(rename = "updateId")]
    pub update_id: String,
    #[serde(rename = "noChange")]
    pub no_change: bool,
    #[serde(rename = "triggeredItems")]
    pub triggered_items: Vec<String>,
    #[serde(rename = "newEventIds")]
    pub new_event_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FetchJobErrorPayload {
    #[serde(rename = "topicId")]
    pub topic_id: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChecklistTriggeredPayload {
    #[serde(rename = "topicId")]
    pub topic_id: String,
    #[serde(rename = "itemId")]
    pub item_id: String,
    #[serde(rename = "itemText")]
    pub item_text: String,
}

struct DoFetchResult {
    payload: FetchJobCompletedPayload,
    event_summaries: Vec<EventSummary>,
}

pub async fn execute_fetch_job(app: AppHandle, db: Connection, topic_id: String) {
    let _ = app.emit(
        "fetch-job-started",
        FetchJobStartedPayload {
            topic_id: topic_id.clone(),
        },
    );

    // Resolve topic info for hooks (best-effort; fall back to id if DB fails)
    let topic_info = get_topic(&db, &topic_id)
        .await
        .ok()
        .map(|t| TopicInfo {
            id: t.id,
            name: t.name,
            emoji: t.emoji,
        })
        .unwrap_or_else(|| TopicInfo {
            id: topic_id.clone(),
            name: topic_id.clone(),
            emoji: "📰".to_string(),
        });

    // Read settings once for all hooks
    let settings = get_settings(&db).await.ok();
    let notifications_enabled = settings
        .as_ref()
        .map(|s| s.notifications_enabled)
        .unwrap_or(true);
    let discord_urls: Vec<String> = settings
        .as_ref()
        .and_then(|s| serde_json::from_str(&s.discord_webhooks).ok())
        .unwrap_or_default();

    let mut hooks = HookEngine::new().register(SystemNotifyHook {
        app: app.clone(),
        enabled: notifications_enabled,
    });
    if !discord_urls.is_empty() {
        hooks = hooks.register(DiscordHook::new(discord_urls));
    }
    // Future: .register(SlackHook::new(settings.slack_webhooks))

    match do_fetch(app.clone(), &db, &topic_id).await {
        Ok(result) => {
            let event = if result.payload.no_change {
                FetchEvent::NoChange
            } else {
                FetchEvent::Success {
                    topic: topic_info,
                    events: result.event_summaries,
                }
            };
            hooks.dispatch(&event).await;
            let _ = app.emit("fetch-job-completed", result.payload);
        }
        Err(e) => {
            let event = FetchEvent::Failure {
                topic: topic_info,
                error: e.to_string(),
            };
            hooks.dispatch(&event).await;
            let _ = app.emit(
                "fetch-job-error",
                FetchJobErrorPayload {
                    topic_id: topic_id.clone(),
                    error: e.to_string(),
                },
            );
        }
    }
}

async fn do_fetch(
    app: AppHandle,
    db: &Connection,
    topic_id: &str,
) -> crate::error::Result<DoFetchResult> {
    let settings = get_settings(db).await?;
    let topic = get_topic(db, topic_id).await?;
    let focus_points = get_focus_points(db, topic_id).await?;
    let checklist_items = get_checklist_items(db, topic_id).await?;
    let active_events = get_active_events(db, topic_id, 50).await?;

    let topic_summary = topic.summary.as_deref();

    // API pricing constants ($/M tokens), kept in sync with frontend
    const API_COST_PER_M_INPUT: f64 = 3.0;
    const API_COST_PER_M_OUTPUT: f64 = 15.0;

    let ctx = FetchContext {
        topic_name: &topic.name,
        topic_description: &topic.description,
        focus_points: &focus_points,
        checklist_items: &checklist_items,
        topic_summary,
        active_events: &active_events,
    };

    let start = Instant::now();
    let (result, input_tokens, output_tokens, cost_usd) = if settings.ai_mode == "agent" {
        let (r, agent_usage) = run_fetch_job_agent(
            &settings.agent_command,
            &settings.agent_model,
            &settings.brave_api_key,
            &ctx,
        )
        .await?;
        (
            r,
            agent_usage.input_tokens,
            agent_usage.output_tokens,
            agent_usage.cost_usd,
        )
    } else {
        let client = AnthropicClient::new(settings.api_key.clone(), settings.model.clone());
        let (r, api_usage) = run_fetch_job(&client, &ctx).await?;
        let (inp, out) = api_usage
            .map(|u| (u.input_tokens as i64, u.output_tokens as i64))
            .unwrap_or((0, 0));
        let cost =
            (inp as f64 * API_COST_PER_M_INPUT + out as f64 * API_COST_PER_M_OUTPUT) / 1_000_000.0;
        (r, inp, out, cost)
    };
    let duration_ms = start.elapsed().as_millis() as i64;

    // 1. Update topic overall summary if provided
    if let Some(ref summary) = result.overall_summary {
        if !summary.is_empty() {
            let _ = update_topic_summary(db, topic_id, summary).await;
        }
    }

    // 2. Process events
    let mut new_event_ids = Vec::new();
    let mut event_summaries = Vec::new();
    for event_out in &result.events {
        let parent_id = event_out.existing_event_id.as_deref();
        match create_news_event(
            db,
            topic_id,
            &NewEventInput {
                title: &event_out.title,
                event_type: &event_out.event_type,
                summary: &event_out.summary,
                sources: &event_out.sources,
                parent_event_id: parent_id,
                occurred_at: event_out.occurred_at.as_deref(),
            },
        )
        .await
        {
            Ok(ev) => {
                new_event_ids.push(ev.id);
                event_summaries.push(EventSummary {
                    title: event_out.title.clone(),
                    event_type: event_out.event_type.clone(),
                    summary: event_out.summary.clone(),
                });
                if event_out.event_type == "resolution" {
                    if let Some(pid) = parent_id {
                        if let Some(parent) = active_events.iter().find(|e| e.id == pid) {
                            let _ = update_news_event(
                                db,
                                pid,
                                &parent.summary,
                                &parent.sources,
                                &parent.event_type,
                                "resolved",
                            )
                            .await;
                        }
                    }
                }
            }
            Err(e) => eprintln!("[NewsLens] failed to create event: {}", e),
        }
    }

    // 3. Save update record
    let content = result
        .overall_summary
        .as_deref()
        .unwrap_or(if result.no_change {
            "No significant changes detected."
        } else {
            "Events updated."
        });
    let update = create_update(db, topic_id, content, result.no_change, &[]).await?;

    // 4. Process checklist evaluations
    let mut triggered_items = Vec::new();
    for eval in &result.checklist_evaluations {
        if eval.triggered {
            if let Some(item) = checklist_items
                .iter()
                .find(|i| i.id == eval.checklist_item_id)
            {
                if !item.triggered {
                    let now = chrono::Utc::now().to_rfc3339();
                    let _ = update_checklist_item_triggered(
                        db,
                        &eval.checklist_item_id,
                        true,
                        Some(now),
                        eval.summary.clone(),
                        eval.impact.clone(),
                    )
                    .await;
                    triggered_items.push(eval.checklist_item_id.clone());
                    let _ = app.emit(
                        "checklist-triggered",
                        ChecklistTriggeredPayload {
                            topic_id: topic_id.to_string(),
                            item_id: item.id.clone(),
                            item_text: item.text.clone(),
                        },
                    );
                }
            }
        }
    }

    // 5. Save run log
    let effective_model = if settings.ai_mode == "agent" {
        settings.agent_model.clone()
    } else {
        settings.model.clone()
    };
    let _ = create_run_log(
        db,
        topic_id,
        &RunLogInput {
            ai_mode: settings.ai_mode.clone(),
            model_name: effective_model,
            input_tokens,
            output_tokens,
            duration_ms,
            no_change: result.no_change,
            events_count: new_event_ids.len() as i64,
            cost_usd,
        },
    )
    .await;

    Ok(DoFetchResult {
        payload: FetchJobCompletedPayload {
            topic_id: topic_id.to_string(),
            update_id: update.id,
            no_change: result.no_change,
            triggered_items,
            new_event_ids,
        },
        event_summaries,
    })
}
