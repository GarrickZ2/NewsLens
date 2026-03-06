use crate::db::models::ChatMessage;
use crate::error::Result;
use chrono::Utc;
use tokio_rusqlite::Connection;
use uuid::Uuid;

pub async fn get_chat_messages(conn: &Connection, topic_id: &str) -> Result<Vec<ChatMessage>> {
    let topic_id = topic_id.to_string();
    let messages = conn
        .call(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, topic_id, role, content, created_at FROM chat_messages WHERE topic_id = ?1 ORDER BY created_at ASC"
            )?;
            let rows = stmt.query_map([&topic_id], |row| {
                Ok(ChatMessage {
                    id: row.get(0)?,
                    topic_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?;
            rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
        })
        .await?;
    Ok(messages)
}

pub async fn save_message(
    conn: &Connection,
    topic_id: &str,
    role: &str,
    content: &str,
) -> Result<ChatMessage> {
    let msg = ChatMessage {
        id: Uuid::new_v4().to_string(),
        topic_id: topic_id.to_string(),
        role: role.to_string(),
        content: content.to_string(),
        created_at: Utc::now().to_rfc3339(),
    };

    let m = msg.clone();
    conn.call(move |conn| {
        conn.execute(
            "INSERT INTO chat_messages (id, topic_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![m.id, m.topic_id, m.role, m.content, m.created_at],
        )?;
        Ok(())
    })
    .await?;

    Ok(msg)
}
