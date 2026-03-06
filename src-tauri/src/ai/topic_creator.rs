use crate::ai::client::{
    AnthropicClient, Message, MessageContent, MessagesRequest, Tool, ToolChoice,
};
use crate::db::models::TopicSuggestion;
use crate::error::{AppError, Result};
use serde_json::json;

pub async fn suggest_topic(client: &AnthropicClient, description: &str) -> Result<TopicSuggestion> {
    let tool = Tool {
        name: "create_topic".to_string(),
        description: "Create a structured topic for news monitoring".to_string(),
        input_schema: json!({
            "type": "object",
            "required": ["name", "emoji", "description", "checklistItems", "focusPoints"],
            "properties": {
                "name": { "type": "string", "description": "Short, clear topic name (3-6 words)" },
                "emoji": { "type": "string", "description": "Single emoji that represents this topic" },
                "description": { "type": "string", "description": "Clear description of what to monitor (2-3 sentences)" },
                "checklistItems": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "3-5 specific conditions/events to alert on"
                },
                "focusPoints": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "3-5 specific aspects to pay attention to"
                }
            }
        }),
        tool_type: None,
    };

    let request = MessagesRequest {
        model: client.model.clone(),
        max_tokens: 1024,
        system: Some("You are an expert at creating structured news monitoring topics. Given a user's description, create a well-defined monitoring topic with clear checklist items and focus points.".to_string()),
        messages: vec![Message {
            role: "user".to_string(),
            content: MessageContent::Text(format!("Create a news monitoring topic for: {}", description)),
        }],
        tools: Some(vec![tool]),
        tool_choice: Some(ToolChoice {
            choice_type: "tool".to_string(),
            name: Some("create_topic".to_string()),
        }),
    };

    let response = client.messages(request, None).await?;

    if let Some(input) = response.get_tool_use("create_topic") {
        let suggestion: TopicSuggestion = serde_json::from_value(input)
            .map_err(|e| AppError::Ai(format!("Failed to parse topic suggestion: {}", e)))?;
        return Ok(suggestion);
    }

    Err(AppError::Ai(
        "AI did not return a topic suggestion".to_string(),
    ))
}
