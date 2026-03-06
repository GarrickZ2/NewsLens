use crate::db::models::TopicMarketSymbol;
use crate::error::Result;
use tokio_rusqlite::Connection;
use uuid::Uuid;

pub struct SymbolInput {
    pub symbol: String,
    pub name: String,
    pub asset_type: String,
    pub reason: Option<String>,
}

pub async fn replace_topic_symbols(
    db: &Connection,
    topic_id: &str,
    symbols: &[SymbolInput],
) -> Result<()> {
    let topic_id = topic_id.to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Group by asset_type, keep top 5 each
    let stock: Vec<&SymbolInput> = symbols.iter().filter(|s| s.asset_type == "stock").take(5).collect();
    let etf: Vec<&SymbolInput> = symbols.iter().filter(|s| s.asset_type == "etf").take(5).collect();
    let crypto: Vec<&SymbolInput> = symbols.iter().filter(|s| s.asset_type == "crypto").take(5).collect();

    let mut all: Vec<(&SymbolInput, i64)> = Vec::new();
    for (i, s) in stock.iter().enumerate() { all.push((s, i as i64)); }
    for (i, s) in etf.iter().enumerate() { all.push((s, i as i64)); }
    for (i, s) in crypto.iter().enumerate() { all.push((s, i as i64)); }

    let rows: Vec<(String, String, String, String, String, i64, String, Option<String>)> = all
        .into_iter()
        .map(|(s, order)| {
            (
                Uuid::new_v4().to_string(),
                topic_id.clone(),
                s.symbol.clone(),
                s.name.clone(),
                s.asset_type.clone(),
                order,
                now.clone(),
                s.reason.clone(),
            )
        })
        .collect();

    db.call(move |conn| {
        conn.execute(
            "DELETE FROM topic_market_symbols WHERE topic_id = ?1",
            rusqlite::params![topic_id],
        )?;
        for (id, tid, symbol, name, asset_type, sort_order, updated_at, reason) in &rows {
            conn.execute(
                "INSERT OR REPLACE INTO topic_market_symbols (id, topic_id, symbol, name, asset_type, sort_order, updated_at, reason)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![id, tid, symbol, name, asset_type, sort_order, updated_at, reason],
            )?;
        }
        Ok(())
    })
    .await?;
    Ok(())
}

pub async fn get_topic_symbols(db: &Connection, topic_id: &str) -> Result<Vec<TopicMarketSymbol>> {
    let topic_id = topic_id.to_string();
    let rows = db
        .call(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, topic_id, symbol, name, asset_type, sort_order, updated_at, reason
                 FROM topic_market_symbols WHERE topic_id = ?1
                 ORDER BY asset_type, sort_order",
            )?;
            let rows = stmt.query_map(rusqlite::params![topic_id], |row| {
                Ok(TopicMarketSymbol {
                    id: row.get(0)?,
                    topic_id: row.get(1)?,
                    symbol: row.get(2)?,
                    name: row.get(3)?,
                    asset_type: row.get(4)?,
                    sort_order: row.get(5)?,
                    updated_at: row.get(6)?,
                    reason: row.get(7)?,
                })
            })?;
            rows.collect::<std::result::Result<Vec<_>, _>>()
                .map_err(Into::into)
        })
        .await?;
    Ok(rows)
}
