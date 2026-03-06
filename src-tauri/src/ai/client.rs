use crate::error::{AppError, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct AnthropicClient {
    pub api_key: String,
    pub model: String,
    pub http: Client,
}

impl AnthropicClient {
    pub fn new(api_key: String, model: String) -> Self {
        let http = Client::builder()
            .build()
            .expect("Failed to create HTTP client");
        Self {
            api_key,
            model,
            http,
        }
    }

    pub async fn messages(
        &self,
        request: MessagesRequest,
        beta_header: Option<&str>,
    ) -> Result<MessagesResponse> {
        let mut req = self
            .http
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json");

        if let Some(beta) = beta_header {
            req = req.header("anthropic-beta", beta);
        }

        let resp = req.json(&request).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Ai(format!(
                "Anthropic API error {}: {}",
                status, body
            )));
        }

        let response: MessagesResponse = resp.json().await?;
        Ok(response)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessagesRequest {
    pub model: String,
    pub max_tokens: u32,
    pub system: Option<String>,
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<Tool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<ToolChoice>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: MessageContent,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(untagged)]
pub enum MessageContent {
    Text(String),
    Blocks(Vec<ContentBlock>),
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ContentBlock {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "tool_use")]
    ToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },
    #[serde(rename = "tool_result")]
    ToolResult {
        tool_use_id: String,
        content: String,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub tool_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolChoice {
    #[serde(rename = "type")]
    pub choice_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessagesResponse {
    pub id: String,
    pub content: Vec<ContentBlock>,
    pub stop_reason: Option<String>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Usage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

impl MessagesResponse {
    pub fn get_text(&self) -> Option<String> {
        for block in &self.content {
            if let ContentBlock::Text { text } = block {
                return Some(text.clone());
            }
        }
        None
    }

    pub fn get_tool_use(&self, name: &str) -> Option<serde_json::Value> {
        for block in &self.content {
            if let ContentBlock::ToolUse { name: n, input, .. } = block {
                if n == name {
                    return Some(input.clone());
                }
            }
        }
        None
    }
}
