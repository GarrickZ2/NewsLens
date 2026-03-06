use crate::db::models::Settings;
use crate::error::Result;
use tokio_rusqlite::Connection;

pub async fn get_settings(conn: &Connection) -> Result<Settings> {
    let settings = conn
        .call(|conn| {
            let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
            let rows = stmt.query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })?;
            let pairs: Vec<(String, String)> = rows.collect::<std::result::Result<Vec<_>, _>>()?;

            let mut settings = Settings {
                default_frequency: "every_3h".to_string(),
                notifications_enabled: true,
                db_version: "1".to_string(),
                agent_command: "claude".to_string(),
                agent_model: "claude-sonnet-4-6".to_string(),
                brave_api_key: String::new(),
                news_sources: String::new(),
                language: "English".to_string(),
                discord_webhooks: "[]".to_string(),
                slack_webhooks: "[]".to_string(),
                lark_webhooks: "[]".to_string(),
                telegram_bots: "[]".to_string(),
            };

            for (key, value) in pairs {
                match key.as_str() {
                    "default_frequency" => settings.default_frequency = value,
                    "notifications_enabled" => settings.notifications_enabled = value == "true",
                    "db_version" => settings.db_version = value,
                    "agent_command" => settings.agent_command = value,
                    "agent_model" => settings.agent_model = value,
                    "brave_api_key" => settings.brave_api_key = value,
                    "news_sources" => settings.news_sources = value,
                    "language" => settings.language = value,
                    "discord_webhooks" => settings.discord_webhooks = value,
                    "slack_webhooks" => settings.slack_webhooks = value,
                    "lark_webhooks" => settings.lark_webhooks = value,
                    "telegram_bots" => settings.telegram_bots = value,
                    _ => {}
                }
            }

            Ok(settings)
        })
        .await?;
    Ok(settings)
}

pub async fn update_settings(
    conn: &Connection,
    updates: Vec<(String, String)>,
) -> Result<Settings> {
    conn.call(move |conn| {
        let tx = conn.unchecked_transaction()?;
        for (key, value) in &updates {
            tx.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
                rusqlite::params![key, value],
            )?;
        }
        tx.commit()?;
        Ok(())
    })
    .await?;

    get_settings(conn).await
}
