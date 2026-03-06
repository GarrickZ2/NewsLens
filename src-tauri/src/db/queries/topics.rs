use crate::db::models::{CreateTopicInput, Topic, UpdateTopicInput};
use crate::error::Result;
use chrono::Utc;
use tokio_rusqlite::Connection;
use uuid::Uuid;

pub async fn get_all_topics(conn: &Connection) -> Result<Vec<Topic>> {
    let topics = conn
        .call(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, emoji, description, status, cron_schedule, created_at, updated_at, archived_at, archive_summary, summary, summary_updated_at FROM topics ORDER BY created_at DESC"
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(Topic {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    emoji: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    cron_schedule: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    archived_at: row.get(8)?,
                    archive_summary: row.get(9)?,
                    summary: row.get(10)?,
                    summary_updated_at: row.get(11)?,
                })
            })?;
            rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
        })
        .await?;
    Ok(topics)
}

pub async fn get_topic(conn: &Connection, id: &str) -> Result<Topic> {
    let id = id.to_string();
    let topic = conn
        .call(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, emoji, description, status, cron_schedule, created_at, updated_at, archived_at, archive_summary, summary, summary_updated_at FROM topics WHERE id = ?"
            )?;
            let mut rows = stmt.query_map([&id], |row| {
                Ok(Topic {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    emoji: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    cron_schedule: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    archived_at: row.get(8)?,
                    archive_summary: row.get(9)?,
                    summary: row.get(10)?,
                    summary_updated_at: row.get(11)?,
                })
            })?;
            rows.next()
                .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)?
                .map_err(Into::into)
        })
        .await?;
    Ok(topic)
}

pub async fn create_topic(conn: &Connection, input: CreateTopicInput) -> Result<Topic> {
    let now = Utc::now().to_rfc3339();
    let topic = Topic {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        emoji: input.emoji.unwrap_or_else(|| "📰".to_string()),
        description: input.description,
        status: "active".to_string(),
        cron_schedule: input
            .cron_schedule
            .unwrap_or_else(|| "every_3h".to_string()),
        created_at: now.clone(),
        updated_at: now,
        archived_at: None,
        archive_summary: None,
        summary: None,
        summary_updated_at: None,
    };

    let t = topic.clone();
    conn.call(move |conn| {
        conn.execute(
            "INSERT INTO topics (id, name, emoji, description, status, cron_schedule, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![t.id, t.name, t.emoji, t.description, t.status, t.cron_schedule, t.created_at, t.updated_at],
        )?;
        Ok(())
    })
    .await?;

    Ok(topic)
}

pub async fn update_topic(conn: &Connection, id: &str, input: UpdateTopicInput) -> Result<Topic> {
    let now = Utc::now().to_rfc3339();
    let id = id.to_string();
    let id_for_get = id.clone();

    conn.call(move |conn| {
        if let Some(name) = &input.name {
            conn.execute(
                "UPDATE topics SET name = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![name, now, id],
            )?;
        } else if let Some(emoji) = &input.emoji {
            conn.execute(
                "UPDATE topics SET emoji = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![emoji, now, id],
            )?;
        } else if let Some(description) = &input.description {
            conn.execute(
                "UPDATE topics SET description = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![description, now, id],
            )?;
        } else if let Some(cron_schedule) = &input.cron_schedule {
            conn.execute(
                "UPDATE topics SET cron_schedule = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![cron_schedule, now, id],
            )?;
        }
        Ok(())
    })
    .await?;

    get_topic(conn, &id_for_get).await
}

pub async fn archive_topic(conn: &Connection, id: &str, summary: Option<String>) -> Result<Topic> {
    let now = Utc::now().to_rfc3339();
    let id = id.to_string();
    let id_for_get = id.clone();
    let now2 = now.clone();

    conn.call(move |conn| {
        conn.execute(
            "UPDATE topics SET status = 'archived', archived_at = ?1, archive_summary = ?2, updated_at = ?3 WHERE id = ?4",
            rusqlite::params![now, summary, now2, id],
        )?;
        Ok(())
    })
    .await?;

    get_topic(conn, &id_for_get).await
}

pub async fn recover_topic(conn: &Connection, id: &str) -> Result<Topic> {
    let now = Utc::now().to_rfc3339();
    let id = id.to_string();
    let id_for_get = id.clone();

    conn.call(move |conn| {
        conn.execute(
            "UPDATE topics SET status = 'active', archived_at = NULL, archive_summary = NULL, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        )?;
        Ok(())
    })
    .await?;

    get_topic(conn, &id_for_get).await
}

pub async fn delete_topic(conn: &Connection, id: &str) -> Result<()> {
    let id = id.to_string();
    conn.call(move |conn| {
        conn.execute("DELETE FROM topics WHERE id = ?1", [&id])?;
        Ok(())
    })
    .await?;
    Ok(())
}

pub async fn get_active_topics(conn: &Connection) -> Result<Vec<Topic>> {
    let topics = conn
        .call(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, emoji, description, status, cron_schedule, created_at, updated_at, archived_at, archive_summary, summary, summary_updated_at FROM topics WHERE status = 'active'"
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(Topic {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    emoji: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    cron_schedule: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    archived_at: row.get(8)?,
                    archive_summary: row.get(9)?,
                    summary: row.get(10)?,
                    summary_updated_at: row.get(11)?,
                })
            })?;
            rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
        })
        .await?;
    Ok(topics)
}

pub async fn update_topic_summary(conn: &Connection, id: &str, summary: &str) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let id = id.to_string();
    let summary = summary.to_string();
    conn.call(move |conn| {
        conn.execute(
            "UPDATE topics SET summary = ?1, summary_updated_at = ?2 WHERE id = ?3",
            rusqlite::params![summary, now, id],
        )?;
        Ok(())
    })
    .await?;
    Ok(())
}
