use crate::db::models::{Source, Update, UpdateWithTopic};
use crate::error::Result;
use chrono::Utc;
use tokio_rusqlite::Connection;
use uuid::Uuid;

fn parse_sources(json: &str) -> Vec<Source> {
    serde_json::from_str(json).unwrap_or_default()
}

pub async fn get_updates(
    conn: &Connection,
    topic_id: &str,
    limit: Option<u32>,
) -> Result<Vec<Update>> {
    let topic_id = topic_id.to_string();
    let limit = limit.unwrap_or(50);
    let updates = conn
        .call(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, topic_id, content, no_change, sources, created_at FROM updates WHERE topic_id = ?1 ORDER BY created_at DESC LIMIT ?2"
            )?;
            let rows = stmt.query_map(rusqlite::params![topic_id, limit], |row| {
                let sources_json: String = row.get(4)?;
                Ok(Update {
                    id: row.get(0)?,
                    topic_id: row.get(1)?,
                    content: row.get(2)?,
                    no_change: row.get::<_, i64>(3)? != 0,
                    sources: parse_sources(&sources_json),
                    created_at: row.get(5)?,
                })
            })?;
            rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
        })
        .await?;
    Ok(updates)
}

pub async fn get_all_recent_updates(conn: &Connection, limit: u32) -> Result<Vec<UpdateWithTopic>> {
    let updates = conn
        .call(move |conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT u.id, u.topic_id, u.content, u.no_change, u.sources, u.created_at,
                       t.name as topic_name, t.emoji as topic_emoji
                FROM updates u
                JOIN topics t ON u.topic_id = t.id
                ORDER BY u.created_at DESC
                LIMIT ?1
                "#,
            )?;
            let rows = stmt.query_map([limit], |row| {
                let sources_json: String = row.get(4)?;
                Ok(UpdateWithTopic {
                    update: Update {
                        id: row.get(0)?,
                        topic_id: row.get(1)?,
                        content: row.get(2)?,
                        no_change: row.get::<_, i64>(3)? != 0,
                        sources: parse_sources(&sources_json),
                        created_at: row.get(5)?,
                    },
                    topic_name: row.get(6)?,
                    topic_emoji: row.get(7)?,
                })
            })?;
            rows.collect::<std::result::Result<Vec<_>, _>>()
                .map_err(Into::into)
        })
        .await?;
    Ok(updates)
}

pub async fn create_update(
    conn: &Connection,
    topic_id: &str,
    content: &str,
    no_change: bool,
    sources: &[Source],
) -> Result<Update> {
    let update = Update {
        id: Uuid::new_v4().to_string(),
        topic_id: topic_id.to_string(),
        content: content.to_string(),
        no_change,
        sources: sources.to_vec(),
        created_at: Utc::now().to_rfc3339(),
    };

    let u = update.clone();
    let sources_json = serde_json::to_string(&u.sources).unwrap_or_else(|_| "[]".to_string());
    conn.call(move |conn| {
        conn.execute(
            "INSERT INTO updates (id, topic_id, content, no_change, sources, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![u.id, u.topic_id, u.content, u.no_change as i64, sources_json, u.created_at],
        )?;
        Ok(())
    })
    .await?;

    Ok(update)
}
