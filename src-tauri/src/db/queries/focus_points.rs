use crate::db::models::FocusPoint;
use crate::error::Result;
use chrono::Utc;
use tokio_rusqlite::Connection;
use uuid::Uuid;

pub async fn get_focus_points(conn: &Connection, topic_id: &str) -> Result<Vec<FocusPoint>> {
    let topic_id = topic_id.to_string();
    let points = conn
        .call(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, topic_id, text, source, created_at FROM focus_points WHERE topic_id = ?1 ORDER BY created_at ASC"
            )?;
            let rows = stmt.query_map([&topic_id], |row| {
                Ok(FocusPoint {
                    id: row.get(0)?,
                    topic_id: row.get(1)?,
                    text: row.get(2)?,
                    source: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?;
            rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
        })
        .await?;
    Ok(points)
}

pub async fn add_focus_point(
    conn: &Connection,
    topic_id: &str,
    text: &str,
    source: &str,
) -> Result<FocusPoint> {
    let point = FocusPoint {
        id: Uuid::new_v4().to_string(),
        topic_id: topic_id.to_string(),
        text: text.to_string(),
        source: source.to_string(),
        created_at: Utc::now().to_rfc3339(),
    };

    let p = point.clone();
    conn.call(move |conn| {
        conn.execute(
            "INSERT INTO focus_points (id, topic_id, text, source, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![p.id, p.topic_id, p.text, p.source, p.created_at],
        )?;
        Ok(())
    })
    .await?;

    Ok(point)
}

pub async fn delete_focus_point(conn: &Connection, id: &str) -> Result<()> {
    let id = id.to_string();
    conn.call(move |conn| {
        conn.execute("DELETE FROM focus_points WHERE id = ?1", [&id])?;
        Ok(())
    })
    .await?;
    Ok(())
}
