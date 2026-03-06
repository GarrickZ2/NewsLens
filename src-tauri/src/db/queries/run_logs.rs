use crate::db::models::{FetchRunLog, GlobalStats, TopicRunStats};
use crate::error::Result;
use chrono::Utc;
use tokio_rusqlite::Connection;
use uuid::Uuid;

pub struct RunLogInput {
    pub ai_mode: String,
    pub model_name: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub duration_ms: i64,
    pub no_change: bool,
    pub events_count: i64,
    pub cost_usd: f64,
}

pub async fn create_run_log(
    db: &Connection,
    topic_id: &str,
    input: &RunLogInput,
) -> Result<FetchRunLog> {
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let no_change_int = if input.no_change { 1i64 } else { 0i64 };

    let log = FetchRunLog {
        id: id.clone(),
        topic_id: topic_id.to_string(),
        ai_mode: input.ai_mode.clone(),
        model_name: input.model_name.clone(),
        input_tokens: input.input_tokens,
        output_tokens: input.output_tokens,
        duration_ms: input.duration_ms,
        no_change: input.no_change,
        events_count: input.events_count,
        cost_usd: input.cost_usd,
        created_at: created_at.clone(),
    };

    let topic_id_owned = topic_id.to_string();
    let ai_mode_owned = input.ai_mode.clone();
    let model_name_owned = input.model_name.clone();
    let input_tokens = input.input_tokens;
    let output_tokens = input.output_tokens;
    let duration_ms = input.duration_ms;
    let events_count = input.events_count;
    let cost_usd = input.cost_usd;

    db.call(move |conn| {
        conn.execute(
            "INSERT INTO fetch_run_logs \
             (id, topic_id, ai_mode, model_name, input_tokens, output_tokens, \
              duration_ms, no_change, events_count, cost_usd, created_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                id,
                topic_id_owned,
                ai_mode_owned,
                model_name_owned,
                input_tokens,
                output_tokens,
                duration_ms,
                no_change_int,
                events_count,
                cost_usd,
                created_at
            ],
        )?;
        Ok(())
    })
    .await?;

    Ok(log)
}

pub async fn get_topic_run_logs(
    db: &Connection,
    topic_id: &str,
    limit: i64,
) -> Result<Vec<FetchRunLog>> {
    let topic_id_owned = topic_id.to_string();
    let logs = db
        .call(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, topic_id, ai_mode, model_name, input_tokens, output_tokens, \
             duration_ms, no_change, events_count, COALESCE(cost_usd, 0.0), created_at \
             FROM fetch_run_logs \
             WHERE topic_id = ?1 \
             ORDER BY created_at DESC \
             LIMIT ?2",
            )?;
            let rows = stmt.query_map(rusqlite::params![topic_id_owned, limit], |row| {
                Ok(FetchRunLog {
                    id: row.get(0)?,
                    topic_id: row.get(1)?,
                    ai_mode: row.get(2)?,
                    model_name: row.get(3)?,
                    input_tokens: row.get(4)?,
                    output_tokens: row.get(5)?,
                    duration_ms: row.get(6)?,
                    no_change: row.get::<_, i64>(7)? != 0,
                    events_count: row.get(8)?,
                    cost_usd: row.get(9)?,
                    created_at: row.get(10)?,
                })
            })?;
            Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
        })
        .await?;
    Ok(logs)
}

pub async fn get_global_stats(
    db: &Connection,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<GlobalStats> {
    let topics = db
        .call(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT \
                t.id, t.name, t.emoji, t.status, t.created_at AS tracking_since, \
                COUNT(r.id) AS total_runs, \
                COALESCE(SUM(r.input_tokens), 0) AS total_input_tokens, \
                COALESCE(SUM(r.output_tokens), 0) AS total_output_tokens, \
                COALESCE(SUM(r.duration_ms), 0) AS total_duration_ms, \
                COALESCE(SUM(CASE WHEN r.no_change=0 THEN 1 ELSE 0 END), 0) AS runs_with_events, \
                (SELECT COUNT(*) FROM news_events e WHERE e.topic_id = t.id) AS event_count, \
                COALESCE(SUM(r.cost_usd), 0.0) AS total_cost_usd \
             FROM topics t \
             LEFT JOIN fetch_run_logs r ON r.topic_id = t.id \
                AND (?1 IS NULL OR r.created_at >= ?1) \
                AND (?2 IS NULL OR r.created_at <= ?2) \
             GROUP BY t.id \
             ORDER BY t.status ASC, total_input_tokens DESC",
            )?;
            let rows = stmt.query_map(rusqlite::params![start_date, end_date], |row| {
                Ok(TopicRunStats {
                    topic_id: row.get(0)?,
                    topic_name: row.get(1)?,
                    topic_emoji: row.get(2)?,
                    topic_status: row.get(3)?,
                    tracking_since: row.get(4)?,
                    total_runs: row.get(5)?,
                    total_input_tokens: row.get(6)?,
                    total_output_tokens: row.get(7)?,
                    total_duration_ms: row.get(8)?,
                    runs_with_events: row.get(9)?,
                    event_count: row.get(10)?,
                    total_cost_usd: row.get(11)?,
                })
            })?;
            Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
        })
        .await?;
    Ok(GlobalStats { topics })
}
