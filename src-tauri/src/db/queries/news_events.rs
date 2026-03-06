use crate::db::models::{NewsEvent, Source};
use crate::error::Result;
use chrono::Utc;
use tokio_rusqlite::Connection;
use uuid::Uuid;

fn parse_sources(json: &str) -> Vec<Source> {
    serde_json::from_str(json).unwrap_or_default()
}

const SELECT_COLS: &str =
    "id, topic_id, title, event_type, status, summary, sources, parent_event_id, first_seen_at, last_updated_at, occurred_at";

fn map_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<NewsEvent> {
    let sources_json: String = row.get(6)?;
    Ok(NewsEvent {
        id: row.get(0)?,
        topic_id: row.get(1)?,
        title: row.get(2)?,
        event_type: row.get(3)?,
        status: row.get(4)?,
        summary: row.get(5)?,
        sources: parse_sources(&sources_json),
        parent_event_id: row.get(7)?,
        first_seen_at: row.get(8)?,
        last_updated_at: row.get(9)?,
        occurred_at: row.get(10)?,
    })
}

pub async fn get_news_events(conn: &Connection, topic_id: &str) -> Result<Vec<NewsEvent>> {
    let topic_id = topic_id.to_string();
    let events = conn
        .call(move |conn| {
            let sql = format!(
                "SELECT {} FROM news_events WHERE topic_id = ?1 ORDER BY first_seen_at DESC",
                SELECT_COLS
            );
            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map([&topic_id], map_event)?;
            rows.collect::<std::result::Result<Vec<_>, _>>()
                .map_err(Into::into)
        })
        .await?;
    Ok(events)
}

pub async fn get_active_events(
    conn: &Connection,
    topic_id: &str,
    limit: u32,
) -> Result<Vec<NewsEvent>> {
    let topic_id = topic_id.to_string();
    let events = conn
        .call(move |conn| {
            let sql = format!(
                "SELECT {} FROM news_events WHERE topic_id = ?1 AND status = 'active' ORDER BY first_seen_at DESC LIMIT ?2",
                SELECT_COLS
            );
            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map(rusqlite::params![topic_id, limit], map_event)?;
            rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
        })
        .await?;
    Ok(events)
}

pub struct NewEventInput<'a> {
    pub title: &'a str,
    pub event_type: &'a str,
    pub summary: &'a str,
    pub sources: &'a [Source],
    pub parent_event_id: Option<&'a str>,
    pub occurred_at: Option<&'a str>,
}

pub async fn create_news_event(
    conn: &Connection,
    topic_id: &str,
    input: &NewEventInput<'_>,
) -> Result<NewsEvent> {
    let now = Utc::now().to_rfc3339();
    let event = NewsEvent {
        id: Uuid::new_v4().to_string(),
        topic_id: topic_id.to_string(),
        title: input.title.to_string(),
        event_type: input.event_type.to_string(),
        status: "active".to_string(),
        summary: input.summary.to_string(),
        sources: input.sources.to_vec(),
        parent_event_id: input.parent_event_id.map(|s| s.to_string()),
        first_seen_at: now.clone(),
        last_updated_at: now,
        occurred_at: input.occurred_at.map(|s| s.to_string()),
    };

    let e = event.clone();
    let sources_json = serde_json::to_string(&e.sources).unwrap_or_else(|_| "[]".to_string());
    conn.call(move |conn| {
        conn.execute(
            "INSERT INTO news_events (id, topic_id, title, event_type, status, summary, sources, parent_event_id, first_seen_at, last_updated_at, occurred_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                e.id, e.topic_id, e.title, e.event_type, e.status,
                e.summary, sources_json, e.parent_event_id,
                e.first_seen_at, e.last_updated_at, e.occurred_at
            ],
        )?;
        Ok(())
    })
    .await?;

    Ok(event)
}

pub async fn update_news_event(
    conn: &Connection,
    id: &str,
    summary: &str,
    sources: &[Source],
    event_type: &str,
    status: &str,
) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let id = id.to_string();
    let summary = summary.to_string();
    let sources_json = serde_json::to_string(sources).unwrap_or_else(|_| "[]".to_string());
    let event_type = event_type.to_string();
    let status = status.to_string();
    conn.call(move |conn| {
        conn.execute(
            "UPDATE news_events SET summary = ?1, sources = ?2, event_type = ?3, status = ?4, last_updated_at = ?5 WHERE id = ?6",
            rusqlite::params![summary, sources_json, event_type, status, now, id],
        )?;
        Ok(())
    })
    .await?;
    Ok(())
}
