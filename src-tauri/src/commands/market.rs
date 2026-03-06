use crate::db::models::TopicMarketSymbol;
use crate::db::queries::market_symbols::{get_topic_symbols, replace_topic_symbols, SymbolInput};
use crate::db::queries::settings::get_settings;
use crate::db::queries::topics::get_topic;
use crate::state::AppState;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use tauri::State;
use tokio::process::Command;

#[derive(Debug, Serialize, Clone)]
pub struct Candle {
    pub t: i64,
    pub o: f64,
    pub h: f64,
    pub l: f64,
    pub c: f64,
}

#[derive(Debug, Serialize)]
pub struct MarketData {
    pub symbol: String,
    pub name: String,
    pub price: f64,
    pub change: f64,
    #[serde(rename = "changePct")]
    pub change_pct: f64,
    pub candles: Vec<Candle>,
    #[serde(rename = "assetType")]
    pub asset_type: String,
}

#[derive(Deserialize)]
struct YfResponse {
    chart: YfChart,
}

#[derive(Deserialize)]
struct YfChart {
    result: Option<Vec<YfResult>>,
}

#[derive(Deserialize)]
struct YfResult {
    meta: YfMeta,
    timestamp: Option<Vec<i64>>,
    indicators: Option<YfIndicators>,
}

#[derive(Deserialize)]
struct YfMeta {
    #[serde(rename = "regularMarketPrice")]
    regular_market_price: Option<f64>,
    #[serde(rename = "chartPreviousClose")]
    chart_previous_close: Option<f64>,
    #[serde(rename = "previousClose")]
    previous_close: Option<f64>,
}

#[derive(Deserialize)]
struct YfIndicators {
    quote: Vec<YfQuote>,
}

#[derive(Deserialize)]
struct YfQuote {
    open: Option<Vec<Option<f64>>>,
    high: Option<Vec<Option<f64>>>,
    low: Option<Vec<Option<f64>>>,
    close: Option<Vec<Option<f64>>>,
}

/// range -> (yf_range, yf_interval)
fn range_params(range: &str) -> (&'static str, &'static str) {
    match range {
        "1d"  => ("1d",  "5m"),
        "5d"  => ("5d",  "15m"),
        "10d" => ("10d", "1h"),
        _     => ("1mo", "1d"),  // default: 1mo
    }
}

fn build_client() -> reqwest::Result<Client> {
    Client::builder().timeout(Duration::from_secs(15)).build()
}

async fn fetch_yahoo(
    client: &Client,
    symbol: &str,
    asset_type: &str,
    range: &str,
) -> Result<MarketData, String> {
    let encoded = symbol.replace('^', "%5E");
    let (yf_range, interval) = range_params(range);
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?interval={}&range={}",
        encoded, interval, yf_range
    );

    let resp = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        .header("Accept", "application/json")
        .header("Referer", "https://finance.yahoo.com/")
        .send()
        .await
        .map_err(|e| format!("[{}] request failed: {}", symbol, e))?;

    let status = resp.status();
    let body = resp.text().await.map_err(|e| format!("[{}] body error: {}", symbol, e))?;

    if !status.is_success() {
        return Err(format!("[{}] HTTP {}: {}", symbol, status, &body[..body.len().min(200)]));
    }

    let yf: YfResponse = serde_json::from_str(&body)
        .map_err(|e| format!("[{}] parse error: {}", symbol, e))?;

    let result = yf
        .chart
        .result
        .and_then(|mut v| if v.is_empty() { None } else { Some(v.remove(0)) })
        .ok_or_else(|| format!("[{}] empty result", symbol))?;

    let price = result.meta.regular_market_price.unwrap_or(0.0);
    let prev_close = result.meta.chart_previous_close
        .or(result.meta.previous_close)
        .unwrap_or(price);
    let change = price - prev_close;
    let change_pct = if prev_close != 0.0 { change / prev_close * 100.0 } else { 0.0 };

    let mut candles: Vec<Candle> = Vec::new();
    if let (Some(timestamps), Some(indicators)) = (result.timestamp, result.indicators) {
        if let Some(quote) = indicators.quote.into_iter().next() {
            let opens = quote.open.unwrap_or_default();
            let highs = quote.high.unwrap_or_default();
            let lows = quote.low.unwrap_or_default();
            let closes = quote.close.unwrap_or_default();
            for i in 0..timestamps.len() {
                let o = opens.get(i).and_then(|v| *v);
                let h = highs.get(i).and_then(|v| *v);
                let l = lows.get(i).and_then(|v| *v);
                let c = closes.get(i).and_then(|v| *v);
                if let (Some(o), Some(h), Some(l), Some(c)) = (o, h, l, c) {
                    candles.push(Candle { t: timestamps[i], o, h, l, c });
                }
            }
        }
    }

    Ok(MarketData { symbol: symbol.to_string(), name: symbol.to_string(), price, change, change_pct, candles, asset_type: asset_type.to_string() })
}

// ── Symbol extraction ─────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct ExtractedSymbols {
    symbols: Vec<ExtractedSymbol>,
}

#[derive(Deserialize)]
struct ExtractedSymbol {
    symbol: String,
    name: String,
    #[serde(rename = "assetType")]
    asset_type: String,
    reason: Option<String>,
}

#[derive(Deserialize)]
struct ClaudeEnvelope {
    #[serde(rename = "type")]
    output_type: String,
    #[serde(default)]
    is_error: bool,
    structured_output: Option<serde_json::Value>,
    result: Option<serde_json::Value>,
}

async fn run_symbol_extraction(
    agent_command: &str,
    agent_model: &str,
    topic_name: &str,
    topic_description: &str,
) -> Result<Vec<SymbolInput>, String> {
    let prompt = format!(
        "Based on the following news topic, identify the most relevant publicly-traded stocks, ETFs, and cryptocurrencies.\n\nTopic: {}\nDescription: {}\n\nReturn Yahoo Finance-compatible ticker symbols (e.g. AAPL, BTC-USD, QQQ). Max 5 per type. For each symbol, provide a concise English reason (1 sentence) explaining why it is relevant to this topic.",
        topic_name, topic_description
    );
    let schema = json!({
        "type": "object",
        "required": ["symbols"],
        "properties": {
            "symbols": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["symbol", "name", "assetType", "reason"],
                    "properties": {
                        "symbol": { "type": "string" },
                        "name": { "type": "string" },
                        "assetType": { "type": "string", "enum": ["stock", "etf", "crypto"] },
                        "reason": { "type": "string", "description": "One-sentence English explanation of why this asset is relevant to the topic" }
                    }
                }
            }
        }
    }).to_string();

    let mut cmd = Command::new(agent_command);
    cmd.arg("-p").arg(&prompt)
        .arg("--output-format").arg("json")
        .arg("--json-schema").arg(&schema)
        .arg("--no-session-persistence")
        .arg("--permission-mode").arg("bypassPermissions")
        .arg("--strict-mcp-config");
    if !agent_model.is_empty() {
        cmd.arg("--model").arg(agent_model);
    }

    let output = tokio::time::timeout(Duration::from_secs(120), cmd.output())
        .await
        .map_err(|_| "Timed out".to_string())?
        .map_err(|e| format!("Failed to run agent: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.is_empty() { return Err("No output".to_string()); }

    let envelope: ClaudeEnvelope = serde_json::from_str(&stdout)
        .map_err(|e| format!("Parse failed: {}", e))?;
    if envelope.is_error || envelope.output_type == "error" {
        return Err(format!("Agent error: {:?}", envelope.result));
    }

    let value = envelope.structured_output.or(envelope.result)
        .ok_or("No output")?;
    let extracted: ExtractedSymbols = if value.is_string() {
        serde_json::from_str(value.as_str().unwrap()).map_err(|e| e.to_string())?
    } else {
        serde_json::from_value(value).map_err(|e| e.to_string())?
    };

    Ok(extracted.symbols.into_iter().map(|s| SymbolInput { symbol: s.symbol, name: s.name, asset_type: s.asset_type, reason: s.reason }).collect())
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_topic_symbols_cmd(
    topic_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TopicMarketSymbol>, String> {
    get_topic_symbols(&state.db, &topic_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn extract_topic_symbols_cmd(
    topic_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TopicMarketSymbol>, String> {
    let topic = get_topic(&state.db, &topic_id).await.map_err(|e| e.to_string())?;
    let settings = get_settings(&state.db).await.map_err(|e| e.to_string())?;
    let inputs = run_symbol_extraction(&settings.agent_command, &settings.agent_model, &topic.name, &topic.description).await?;
    if !inputs.is_empty() {
        replace_topic_symbols(&state.db, &topic_id, &inputs).await.map_err(|e| e.to_string())?;
    }
    get_topic_symbols(&state.db, &topic_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_market_data_cmd(
    symbols: Vec<serde_json::Value>,
    range: String,
) -> Result<Vec<MarketData>, String> {
    let client = build_client().map_err(|e| e.to_string())?;
    let mut handles = Vec::new();
    for item in symbols {
        let symbol = item["symbol"].as_str().unwrap_or("").to_string();
        let name = item["name"].as_str().unwrap_or(&symbol).to_string();
        let asset_type = item["assetType"].as_str().unwrap_or("stock").to_string();
        let range = range.clone();
        let client = client.clone();
        handles.push(tokio::spawn(async move {
            fetch_yahoo(&client, &symbol, &asset_type, &range).await.ok().map(|mut d| { d.name = name; d })
        }));
    }
    let mut results = Vec::new();
    for h in handles { if let Ok(Some(d)) = h.await { results.push(d); } }
    Ok(results)
}

#[tauri::command]
pub async fn fetch_index_data_cmd(range: String) -> Result<Vec<MarketData>, String> {
    let indices = [("^GSPC", "S&P 500"), ("^DJI", "Dow Jones"), ("^IXIC", "NASDAQ"), ("^RUT", "Russell 2000")];
    let client = build_client().map_err(|e| e.to_string())?;
    let mut results = Vec::new();
    let mut errors = Vec::new();
    for (symbol, name) in &indices {
        match fetch_yahoo(&client, symbol, "index", &range).await {
            Ok(mut d) => { d.name = name.to_string(); results.push(d); }
            Err(e) => errors.push(e),
        }
    }
    if results.is_empty() {
        return Err(format!("All index fetches failed:\n{}", errors.join("\n")));
    }
    Ok(results)
}
