use thiserror::Error;

#[derive(Debug, Error)]
#[allow(dead_code)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] tokio_rusqlite::Error),

    #[error("SQLite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),

    #[error("Serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("AI error: {0}")]
    Ai(String),

    #[error("Scheduler error: {0}")]
    Scheduler(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

// 让 AppError 可以被 Tauri commands 返回（序列化为 JSON 字符串）
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
