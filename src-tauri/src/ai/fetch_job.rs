use crate::ai::client::{
    AnthropicClient, Message, MessageContent, MessagesRequest, Tool, ToolChoice, Usage,
};
use crate::db::models::{ChecklistItem, FocusPoint, NewsEvent, Source};
use crate::error::{AppError, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChecklistEvaluation {
    #[serde(rename = "checklistItemId")]
    pub checklist_item_id: String,
    pub triggered: bool,
    pub summary: Option<String>,
    pub impact: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewsEventOutput {
    #[serde(rename = "existingEventId")]
    pub existing_event_id: Option<String>,
    pub title: String,
    #[serde(rename = "eventType")]
    pub event_type: String, // "new" | "escalation" | "resolution"
    pub summary: String,
    #[serde(default)]
    pub sources: Vec<Source>,
    /// Real-world time the event actually occurred (ISO 8601 or natural language date)
    #[serde(rename = "occurredAt")]
    pub occurred_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FetchJobResult {
    #[serde(rename = "noChange")]
    pub no_change: bool,
    #[serde(rename = "overallSummary")]
    pub overall_summary: Option<String>,
    #[serde(default)]
    pub events: Vec<NewsEventOutput>,
    #[serde(rename = "checklistEvaluations", default)]
    pub checklist_evaluations: Vec<ChecklistEvaluation>,
}

/// Topic context passed to both API and agent fetch jobs
pub struct FetchContext<'a> {
    pub topic_name: &'a str,
    pub topic_description: &'a str,
    pub focus_points: &'a [FocusPoint],
    pub checklist_items: &'a [ChecklistItem],
    pub topic_summary: Option<&'a str>,
    pub active_events: &'a [NewsEvent],
}

pub async fn run_fetch_job(
    client: &AnthropicClient,
    ctx: &FetchContext<'_>,
) -> Result<(FetchJobResult, Option<Usage>)> {
    let system_prompt = build_system_prompt(ctx);

    let report_findings_tool = Tool {
        name: "report_findings".to_string(),
        description: "Report the research findings in structured format. Call this tool when you have finished researching.".to_string(),
        input_schema: json!({
            "type": "object",
            "required": ["noChange", "events"],
            "properties": {
                "noChange": {
                    "type": "boolean",
                    "description": "True if there are no significant new developments since the last update"
                },
                "overallSummary": {
                    "type": "string",
                    "description": "2-4 sentence summary of the current overall situation. Fill this every time there is something to report."
                },
                "events": {
                    "type": "array",
                    "description": "Empty array when noChange=true. Otherwise list new/escalated/resolved events discovered this run.",
                    "items": {
                        "type": "object",
                        "required": ["title", "eventType", "summary"],
                        "properties": {
                            "existingEventId": {
                                "type": "string",
                                "description": "ID of an existing active event this is an update for (escalation/resolution)"
                            },
                            "title": { "type": "string" },
                            "eventType": {
                                "type": "string",
                                "enum": ["new", "escalation", "resolution"]
                            },
                            "summary": { "type": "string" },
                            "occurredAt": {
                                "type": "string",
                                "description": "The real-world date/time the event actually occurred, as reported by sources (ISO 8601 preferred, e.g. '2026-03-04T08:00:00Z'). Leave empty if unknown."
                            },
                            "sources": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": { "type": "string" },
                                        "url": { "type": "string" }
                                    }
                                }
                            }
                        }
                    }
                },
                "checklistEvaluations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "checklistItemId": { "type": "string" },
                            "triggered": { "type": "boolean" },
                            "summary": { "type": "string" },
                            "impact": { "type": "string" }
                        },
                        "required": ["checklistItemId", "triggered"]
                    }
                }
            }
        }),
        tool_type: None,
    };

    // Use web_search beta + report_findings tool
    let now_str = Utc::now().format("%Y-%m-%d %H:%M UTC").to_string();
    let request = MessagesRequest {
        model: client.model.clone(),
        max_tokens: 4096,
        system: Some(system_prompt),
        messages: vec![Message {
            role: "user".to_string(),
            content: MessageContent::Text(
                format!(
                    "Today is {}. Please research the LATEST news and developments for the topic '{}' — focus specifically on what happened TODAY and in the last 24 hours. Use date-specific search queries (e.g. include today's date or 'today') to surface the most recent content. Then call report_findings with your structured findings.",
                    now_str, ctx.topic_name
                )
            ),
        }],
        tools: Some(vec![report_findings_tool]),
        tool_choice: Some(ToolChoice {
            choice_type: "auto".to_string(),
            name: None,
        }),
    };

    let response = client
        .messages(request, Some("web-search-2025-03-05"))
        .await?;
    let usage = response.usage.clone();

    // Extract report_findings tool call result
    if let Some(findings) = response.get_tool_use("report_findings") {
        let result: FetchJobResult = serde_json::from_value(findings)
            .map_err(|e| AppError::Ai(format!("Failed to parse findings: {}", e)))?;
        return Ok((result, usage));
    }

    // Fallback: treat text response as no-change
    Ok((
        FetchJobResult {
            no_change: true,
            overall_summary: None,
            events: vec![],
            checklist_evaluations: vec![],
        },
        usage,
    ))
}

pub fn build_system_prompt(ctx: &FetchContext<'_>) -> String {
    let now = Utc::now();
    let now_str = now.format("%Y-%m-%d %H:%M UTC").to_string();
    let cutoff_str = (now - chrono::Duration::hours(48))
        .format("%Y-%m-%d %H:%M UTC")
        .to_string();

    let mut prompt = format!(
        r#"You are a news research assistant monitoring the topic: "{}"

Topic Description: {}

## ⏰ Current date/time: {}
Only report events that occurred AFTER {}. Always include today's date in your search queries.

"#,
        ctx.topic_name, ctx.topic_description, now_str, cutoff_str
    );

    if !ctx.focus_points.is_empty() {
        prompt.push_str("## Focus Points (pay special attention to these):\n");
        for (i, fp) in ctx.focus_points.iter().enumerate() {
            prompt.push_str(&format!("{}. {}\n", i + 1, fp.text));
        }
        prompt.push('\n');
    }

    if !ctx.checklist_items.is_empty() {
        prompt.push_str("## Alert Checklist (evaluate each item and mark as triggered if the condition is met):\n");
        for item in ctx.checklist_items {
            let status = if item.triggered {
                "[ALREADY TRIGGERED]"
            } else {
                "[MONITORING]"
            };
            prompt.push_str(&format!(
                "- ID: {} | {} | Condition: {}\n",
                item.id, status, item.text
            ));
        }
        prompt.push('\n');
    }

    if let Some(summary) = ctx.topic_summary {
        prompt.push_str(&format!("## Current Situation Summary\n{}\n\n", summary));
    }

    {
        use std::collections::HashMap;

        // Group events by thread root; exclude resolution-type events
        let mut threads: HashMap<String, Vec<&NewsEvent>> = HashMap::new();
        for ev in ctx.active_events.iter() {
            if ev.event_type == "resolution" {
                continue;
            }
            let root_id = ev.parent_event_id.as_deref().unwrap_or(&ev.id).to_string();
            threads.entry(root_id).or_default().push(ev);
        }

        if !threads.is_empty() {
            prompt.push_str("## Currently Tracked Active Events (latest update per thread):\n");
            prompt.push_str("(You MUST reference these IDs via existingEventId when reporting escalations or resolutions)\n");

            let mut root_ids: Vec<String> = threads.keys().cloned().collect();
            root_ids.sort();

            for root_id in &root_ids {
                let events = &threads[root_id];
                let latest = events.iter().max_by_key(|e| &e.last_updated_at).unwrap();

                let summary_chars: String = latest.summary.chars().take(300).collect();
                let summary_display = if latest.summary.chars().count() > 300 {
                    format!("{}...", summary_chars)
                } else {
                    summary_chars
                };

                prompt.push_str(&format!(
                    "- Thread [Root: {}] | Latest — ID: {} | Type: {} | Title: {}\n  Summary: {}\n",
                    root_id, latest.id, latest.event_type, latest.title, summary_display
                ));
            }
            prompt.push('\n');
        } else {
            prompt.push_str("## Currently Tracked Active Events: none\n\n");
        }
    }

    prompt.push_str(&format!(r#"## Event Type Rules (IMPORTANT — read carefully):
- "new": A genuinely NEW development not yet tracked in the active events list above
- "escalation": An existing tracked event has WORSENED or INTENSIFIED. You MUST set existingEventId to the matching ID from the active events list. DO NOT use "escalation" if there are no active events, or if you cannot match it to a specific active event ID.
- "resolution": An existing tracked event has concluded or been resolved. You MUST set existingEventId. DO NOT use "resolution" without a matching active event ID.
- If there are NO active events listed above, ALL events in your report MUST use type "new".

## Search & Reporting Instructions:
1. Search the web for the LATEST news. Use explicit date-filtered queries, e.g. "{topic_name} {today}" or "{topic_name} site:reuters.com OR site:apnews.com"
2. Prioritize results from TODAY and yesterday. Discard anything older than 48 hours unless it is the only available source
3. Evaluate each checklist item against the findings
4. Call report_findings with structured results
5. If nothing significant has changed in the last 48 hours, set noChange=true and events=[]
6. For each event, set occurredAt to the actual date/time the event happened per sources (ISO 8601)"#,
        topic_name = ctx.topic_name,
        today = now.format("%Y-%m-%d"),
    ));

    prompt
}
