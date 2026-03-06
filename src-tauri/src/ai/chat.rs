use crate::ai::client::{AnthropicClient, Message, MessageContent, MessagesRequest};
use crate::db::models::{ChatMessage, ChecklistItem, FocusPoint, Topic, Update};
use crate::error::Result;

pub async fn send_chat_message(
    client: &AnthropicClient,
    topic: &Topic,
    focus_points: &[FocusPoint],
    checklist_items: &[ChecklistItem],
    recent_updates: &[Update],
    history: &[ChatMessage],
    user_message: &str,
) -> Result<String> {
    let system_prompt =
        build_chat_system_prompt(topic, focus_points, checklist_items, recent_updates);

    let mut messages: Vec<Message> = history
        .iter()
        .map(|msg| Message {
            role: if msg.role == "ai" {
                "assistant".to_string()
            } else {
                msg.role.clone()
            },
            content: MessageContent::Text(msg.content.clone()),
        })
        .collect();

    messages.push(Message {
        role: "user".to_string(),
        content: MessageContent::Text(user_message.to_string()),
    });

    let request = MessagesRequest {
        model: client.model.clone(),
        max_tokens: 2048,
        system: Some(system_prompt),
        messages,
        tools: None,
        tool_choice: None,
    };

    let response = client.messages(request, None).await?;
    let text = response
        .get_text()
        .unwrap_or_else(|| "I couldn't generate a response.".to_string());

    Ok(text)
}

fn build_chat_system_prompt(
    topic: &Topic,
    focus_points: &[FocusPoint],
    checklist_items: &[ChecklistItem],
    recent_updates: &[Update],
) -> String {
    let mut prompt = format!(
        r#"You are an expert news analyst and research assistant for the topic: "{}"

Topic Description: {}

"#,
        topic.name, topic.description
    );

    if !focus_points.is_empty() {
        prompt.push_str("## Current Focus Points:\n");
        for fp in focus_points {
            prompt.push_str(&format!("- {}\n", fp.text));
        }
        prompt.push('\n');
    }

    if !checklist_items.is_empty() {
        prompt.push_str("## Alert Checklist Status:\n");
        for item in checklist_items {
            let status = if item.triggered {
                "✅ TRIGGERED"
            } else {
                "⏳ Monitoring"
            };
            prompt.push_str(&format!("- {} | {}\n", status, item.text));
        }
        prompt.push('\n');
    }

    if !recent_updates.is_empty() {
        prompt.push_str("## Recent Updates (last 5):\n");
        for update in recent_updates.iter().take(5) {
            prompt.push_str(&format!(
                "### {}\n{}\n\n",
                update.created_at, update.content
            ));
        }
    }

    prompt.push_str(r#"## Instructions:
- Answer questions about this topic based on the context provided
- If you suggest adding a new focus point, include it in your response as: [SUGGEST_FOCUS_ADD: "your suggestion here"]
- Be concise but thorough
- Reference specific updates when relevant"#);

    prompt
}
