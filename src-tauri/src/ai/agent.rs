use std::collections::HashMap;
use std::time::Duration;

use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use tokio::process::Command;
use tokio::time::timeout;

use crate::ai::fetch_job::{build_system_prompt, FetchContext, FetchJobResult};
use crate::error::{AppError, Result};

/// Token + cost 信息（从 agent 输出提取）
#[derive(Debug, Default)]
pub struct AgentTokenUsage {
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
}

/// Claude Code --output-format json 的外层 envelope
#[derive(Debug, Deserialize)]
struct ClaudeJsonOutput {
    #[serde(rename = "type")]
    output_type: String,
    #[serde(default)]
    is_error: bool,
    /// --json-schema 生效时，结构化结果在这里
    structured_output: Option<serde_json::Value>,
    /// 无 structured_output 时的纯文本兜底
    result: Option<serde_json::Value>,
    /// 总费用（美元）
    #[serde(default)]
    total_cost_usd: f64,
    /// 各模型 token 用量
    #[serde(rename = "modelUsage")]
    model_usage: Option<HashMap<String, ModelUsageEntry>>,
}

#[derive(Debug, Deserialize)]
struct ModelUsageEntry {
    #[serde(rename = "inputTokens", default)]
    input_tokens: i64,
    #[serde(rename = "outputTokens", default)]
    output_tokens: i64,
    #[serde(rename = "cacheReadInputTokens", default)]
    cache_read_input_tokens: i64,
    #[serde(rename = "cacheCreationInputTokens", default)]
    cache_creation_input_tokens: i64,
}

pub async fn run_fetch_job_agent(
    agent_command: &str,
    agent_model: &str,
    brave_api_key: &str,
    ctx: &FetchContext<'_>,
) -> Result<(FetchJobResult, AgentTokenUsage)> {
    let system_prompt = build_system_prompt(ctx);

    let json_schema = build_json_schema();

    let now_str = Utc::now().format("%Y-%m-%d %H:%M UTC").to_string();
    let user_message = format!(
        "当前时间：{}。请使用 WebSearch/WebFetch 搜索该 Topic【今日及过去 24 小时内】的最新动态，\
        搜索时请在关键词中包含今天日期以过滤出最新内容。\
        评估所有 Checklist 条件，识别与该 Topic 相关的股票/ETF/加密货币（使用 Yahoo Finance ticker），\
        然后严格按 JSON Schema 格式输出结果。",
        now_str
    );

    let mut cmd = Command::new(agent_command);
    cmd.arg("-p")
        .arg(&user_message)
        .arg("--system-prompt")
        .arg(&system_prompt)
        .arg("--output-format")
        .arg("json")
        .arg("--json-schema")
        .arg(&json_schema)
        .arg("--tools")
        .arg("WebSearch,WebFetch")
        .arg("--allowedTools")
        .arg("WebSearch,WebFetch")
        .arg("--no-session-persistence")
        .arg("--permission-mode")
        .arg("bypassPermissions");

    if !agent_model.is_empty() {
        cmd.arg("--model").arg(agent_model);
    }

    // 总是启用 strict-mcp-config 来忽略用户本地的开发工具 MCP
    cmd.arg("--strict-mcp-config");

    // 如果配置了 Brave API Key，加载 Brave Search MCP 增强搜索能力
    if !brave_api_key.is_empty() {
        let mcp_config = json!({
            "mcpServers": {
                "brave-search": {
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
                    "env": {
                        "BRAVE_API_KEY": brave_api_key
                    }
                }
            }
        })
        .to_string();
        cmd.arg("--mcp-config").arg(mcp_config);
    }

    // 20 分钟超时
    let output = timeout(Duration::from_secs(1200), cmd.output())
        .await
        .map_err(|_| AppError::Ai("Agent 超时（20 分钟）".to_string()))?
        .map_err(|e| AppError::Ai(format!("无法启动 Agent 进程: {}", e)))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !stderr.is_empty() {
        let _ = std::fs::write("/tmp/newslens_agent_stderr.txt", stderr.as_bytes());
    }

    if stdout.is_empty() {
        return Err(AppError::Ai(format!("Agent 无输出，stderr: {}", stderr)));
    }

    parse_agent_output(&stdout)
}

fn parse_agent_output(stdout: &str) -> Result<(FetchJobResult, AgentTokenUsage)> {
    // 解析 Claude Code 的 JSON envelope
    let envelope: ClaudeJsonOutput = serde_json::from_str(stdout).map_err(|e| {
        AppError::Ai(format!(
            "解析 Agent 输出 envelope 失败: {}\n原始输出: {}",
            e,
            stdout.chars().take(500).collect::<String>()
        ))
    })?;

    if envelope.is_error || envelope.output_type == "error" {
        return Err(AppError::Ai(format!(
            "Agent 返回错误: {:?}",
            envelope.result
        )));
    }

    // 从 modelUsage 汇总所有模型的 token 用量（含 cache）
    let token_usage = {
        let (total_input, total_output) = envelope
            .model_usage
            .as_ref()
            .map(|mu| {
                let inp: i64 = mu
                    .values()
                    .map(|m| {
                        m.input_tokens + m.cache_read_input_tokens + m.cache_creation_input_tokens
                    })
                    .sum();
                let out: i64 = mu.values().map(|m| m.output_tokens).sum();
                (inp, out)
            })
            .unwrap_or((0, 0));
        AgentTokenUsage {
            input_tokens: total_input,
            output_tokens: total_output,
            cost_usd: envelope.total_cost_usd,
        }
    };

    // 优先用 structured_output（--json-schema 生效时 Claude Code 填这里）
    if let Some(so) = envelope.structured_output {
        let fetch_result = serde_json::from_value(so)
            .map_err(|e| AppError::Ai(format!("解析 structured_output 失败: {}", e)))?;
        return Ok((fetch_result, token_usage));
    }

    // 兜底：从 result 字段提取（纯 JSON 或 markdown+JSON 混合）
    let result = envelope
        .result
        .ok_or_else(|| AppError::Ai("Agent 输出中无 structured_output 也无 result".to_string()))?;

    let fetch_result = extract_fetch_result(result)?;
    Ok((fetch_result, token_usage))
}

/// 从 result 值中提取 FetchJobResult，兼容三种情况：
/// 1. 直接是 JSON 对象
/// 2. 纯 JSON 字符串
/// 3. markdown + JSON 混合字符串（依次尝试每个 '{' 作为起点）
fn extract_fetch_result(result: serde_json::Value) -> Result<FetchJobResult> {
    #[allow(clippy::needless_return)]
    match result {
        serde_json::Value::String(s) => {
            // 先尝试直接解析
            if let Ok(r) = serde_json::from_str::<FetchJobResult>(&s) {
                return Ok(r);
            }
            // 逐个 '{' 位置尝试提取 JSON
            let mut pos = 0;
            while pos < s.len() {
                if let Some(rel) = s[pos..].find('{') {
                    let start = pos + rel;
                    if let Ok(r) = serde_json::from_str::<FetchJobResult>(&s[start..]) {
                        return Ok(r);
                    }
                    pos = start + 1;
                } else {
                    break;
                }
            }
            Err(AppError::Ai(format!(
                "无法从 Agent 输出提取 FetchJobResult JSON，输出前500字: {}",
                s.chars().take(500).collect::<String>()
            )))
        }
        other => serde_json::from_value(other)
            .map_err(|e| AppError::Ai(format!("解析 Agent JSON 对象失败: {}", e))),
    }
}

fn build_json_schema() -> String {
    json!({
        "type": "object",
        "required": ["noChange", "events"],
        "properties": {
            "noChange": {
                "type": "boolean",
                "description": "如果自上次以来没有重要新进展则为 true"
            },
            "overallSummary": {
                "type": "string",
                "description": "当前整体局势的2-4句摘要，有新进展时必填"
            },
            "events": {
                "type": "array",
                "description": "noChange=true 时传空数组，否则列出本次新发现/升级/解决的事件。类型规则：escalation/resolution 必须提供 existingEventId；若无活跃事件则所有条目必须用 new。",
                "items": {
                    "type": "object",
                    "required": ["title", "eventType", "summary"],
                    "properties": {
                        "existingEventId": {
                            "type": "string",
                            "description": "活跃事件列表中对应事件的 ID。escalation/resolution 必填；new 类型不填。"
                        },
                        "title": { "type": "string" },
                        "eventType": {
                            "type": "string",
                            "enum": ["new", "escalation", "resolution"]
                        },
                        "summary": { "type": "string" },
                        "occurredAt": {
                            "type": "string",
                            "description": "事件实际发生的时间（优先 ISO 8601，如 '2026-03-04T08:00:00Z'）。来源中无明确时间则留空。"
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
                    "required": ["checklistItemId", "triggered"],
                    "properties": {
                        "checklistItemId": { "type": "string" },
                        "triggered": { "type": "boolean" },
                        "summary": { "type": "string" },
                        "impact": { "type": "string" }
                    }
                }
            },
            "relatedSymbols": {
                "type": "array",
                "description": "与该 Topic 直接相关的金融资产，使用 Yahoo Finance 兼容 ticker。每种类型最多 5 个。",
                "items": {
                    "type": "object",
                    "required": ["symbol", "name", "assetType", "reason"],
                    "properties": {
                        "symbol": {
                            "type": "string",
                            "description": "Yahoo Finance ticker，例如 AAPL、BTC-USD、QQQ"
                        },
                        "name": { "type": "string", "description": "资产全名" },
                        "assetType": {
                            "type": "string",
                            "enum": ["stock", "etf", "crypto"],
                            "description": "资产类型"
                        },
                        "reason": {
                            "type": "string",
                            "description": "One-sentence English explanation of why this asset is directly relevant to this topic"
                        }
                    }
                }
            }
        }
    })
    .to_string()
}
