use crate::db::models::ChecklistItem;
use crate::error::Result;
use tokio_rusqlite::Connection;
use uuid::Uuid;

fn row_to_checklist(row: &rusqlite::Row) -> rusqlite::Result<ChecklistItem> {
    Ok(ChecklistItem {
        id: row.get(0)?,
        topic_id: row.get(1)?,
        text: row.get(2)?,
        triggered: row.get::<_, i64>(3)? != 0,
        triggered_at: row.get(4)?,
        summary: row.get(5)?,
        impact: row.get(6)?,
        sort_order: row.get(7)?,
    })
}

pub async fn get_checklist_items(conn: &Connection, topic_id: &str) -> Result<Vec<ChecklistItem>> {
    let topic_id = topic_id.to_string();
    let items = conn
        .call(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, topic_id, text, triggered, triggered_at, summary, impact, sort_order FROM checklist_items WHERE topic_id = ?1 ORDER BY sort_order ASC"
            )?;
            let rows = stmt.query_map([&topic_id], row_to_checklist)?;
            rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
        })
        .await?;
    Ok(items)
}

pub async fn add_checklist_item(
    conn: &Connection,
    topic_id: &str,
    text: &str,
) -> Result<ChecklistItem> {
    let item = ChecklistItem {
        id: Uuid::new_v4().to_string(),
        topic_id: topic_id.to_string(),
        text: text.to_string(),
        triggered: false,
        triggered_at: None,
        summary: None,
        impact: None,
        sort_order: 0,
    };

    let i = item.clone();
    conn.call(move |conn| {
        // Get the current max sort_order for this topic
        let max_order: i64 = conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM checklist_items WHERE topic_id = ?1",
            [&i.topic_id],
            |row| row.get(0),
        ).unwrap_or(-1);

        conn.execute(
            "INSERT INTO checklist_items (id, topic_id, text, triggered, sort_order) VALUES (?1, ?2, ?3, 0, ?4)",
            rusqlite::params![i.id, i.topic_id, i.text, max_order + 1],
        )?;
        Ok(())
    })
    .await?;

    Ok(item)
}

pub async fn reorder_checklist_items(
    conn: &Connection,
    topic_id: &str,
    ids: Vec<String>,
) -> Result<()> {
    let topic_id = topic_id.to_string();
    conn.call(move |conn| {
        let tx = conn.unchecked_transaction()?;
        for (idx, id) in ids.iter().enumerate() {
            tx.execute(
                "UPDATE checklist_items SET sort_order = ?1 WHERE id = ?2 AND topic_id = ?3",
                rusqlite::params![idx as i64, id, topic_id],
            )?;
        }
        tx.commit()?;
        Ok(())
    })
    .await?;
    Ok(())
}

pub async fn delete_checklist_item(conn: &Connection, id: &str) -> Result<()> {
    let id = id.to_string();
    conn.call(move |conn| {
        conn.execute("DELETE FROM checklist_items WHERE id = ?1", [&id])?;
        Ok(())
    })
    .await?;
    Ok(())
}

pub async fn update_checklist_item_triggered(
    conn: &Connection,
    id: &str,
    triggered: bool,
    triggered_at: Option<String>,
    summary: Option<String>,
    impact: Option<String>,
) -> Result<()> {
    let id = id.to_string();
    conn.call(move |conn| {
        conn.execute(
            "UPDATE checklist_items SET triggered = ?1, triggered_at = ?2, summary = ?3, impact = ?4 WHERE id = ?5",
            rusqlite::params![triggered as i64, triggered_at, summary, impact, id],
        )?;
        Ok(())
    })
    .await?;
    Ok(())
}
