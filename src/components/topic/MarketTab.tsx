import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { listen } from "@tauri-apps/api/event";
import { TrendingUp, TrendingDown, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { fetchMarketData, fetchIndexData, getTopicSymbols, extractTopicSymbols } from "../../lib/tauri";
import type { MarketData, Candle, TopicMarketSymbol } from "../../types";

type Range = "1d" | "5d" | "10d" | "1mo";
const RANGES: { value: Range; label: string }[] = [
  { value: "1d",  label: "1D" },
  { value: "5d",  label: "5D" },
  { value: "10d", label: "10D" },
  { value: "1mo", label: "1M" },
];

function isUsMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return utcMinutes >= 14 * 60 + 30 && utcMinutes < 21 * 60;
}

function extractionKey(topicId: string) { return `newslens_extracted_${topicId}`; }
function markExtracted(topicId: string) { localStorage.setItem(extractionKey(topicId), "1"); }
function wasExtracted(topicId: string) { return localStorage.getItem(extractionKey(topicId)) === "1"; }

function fmt(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function pctColor(pct: number) {
  return pct > 0 ? "#22c55e" : pct < 0 ? "#ef4444" : "var(--text-muted)";
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  return (
    <div
      style={{ minWidth: 0, overflow: "hidden" }}
      onMouseEnter={(e) => setRect((e.currentTarget as HTMLElement).getBoundingClientRect())}
      onMouseLeave={() => setRect(null)}
    >
      {children}
      {rect && createPortal(
        <div style={{
          position: "fixed",
          left: rect.left,
          top: rect.top - 6,
          transform: "translateY(-100%)",
          background: "var(--bg-tooltip, #1a1a2e)",
          color: "var(--text-primary)",
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 12,
          maxWidth: 340,
          whiteSpace: "normal",
          wordBreak: "break-word",
          zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          border: "1px solid var(--border)",
          pointerEvents: "none",
        }}>
          {text}
        </div>,
        document.body
      )}
    </div>
  );
}

function Sparkline({ candles, positive }: { candles: Candle[]; positive: boolean }) {
  if (candles.length < 2) return null;
  const W = 80, H = 32;
  const closes = candles.map((c) => c.c);
  const min = Math.min(...closes), max = Math.max(...closes);
  const range = max - min || 1;
  const pts = closes.map((v, i) => `${(i / (closes.length - 1)) * W},${H - ((v - min) / range) * H}`);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      <polyline points={pts.join(" ")} fill="none" stroke={positive ? "#22c55e" : "#ef4444"}
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CandlestickChart({ candles }: { candles: Candle[] }) {
  if (candles.length === 0) return <div style={{ width: 120, height: 48 }} />;
  const W = 120, H = 48, n = candles.length;
  const allPrices = candles.flatMap((c) => [c.h, c.l]);
  const min = Math.min(...allPrices), max = Math.max(...allPrices);
  const range = max - min || 1;
  const candleW = Math.max(2, Math.floor(W / n) - 1);
  const toY = (v: number) => H - ((v - min) / range) * H;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      {candles.map((c, i) => {
        const x = (i / n) * W + candleW / 2;
        const color = c.c >= c.o ? "#22c55e" : "#ef4444";
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyH = Math.max(1, Math.abs(toY(c.o) - toY(c.c)));
        return (
          <g key={i}>
            <line x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)} stroke={color} strokeWidth={0.8} />
            <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} fillOpacity={0.85} />
          </g>
        );
      })}
    </svg>
  );
}

function IndexCard({ data }: { data: MarketData }) {
  const up = data.changePct >= 0;
  return (
    <div style={{ flex: "1 1 160px", minWidth: 140, padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{data.name}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>{fmt(data.price)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: pctColor(data.changePct), fontWeight: 600 }}>
          {up ? "+" : ""}{data.changePct.toFixed(2)}%
        </span>
        <Sparkline candles={data.candles} positive={up} />
      </div>
    </div>
  );
}

function SymbolRow({ data, reason }: { data: MarketData; reason?: string }) {
  const up = data.changePct >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}>
      <div style={{ width: 130, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.symbol}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.name}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {reason && (
          <Tooltip text={reason}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{reason}</div>
          </Tooltip>
        )}
      </div>
      <div style={{ textAlign: "right", width: 80, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>{fmt(data.price)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
          {up ? <TrendingUp size={11} color="#22c55e" /> : <TrendingDown size={11} color="#ef4444" />}
          <span style={{ fontSize: 11, color: pctColor(data.changePct), fontWeight: 600 }}>
            {up ? "+" : ""}{data.changePct.toFixed(2)}%
          </span>
        </div>
      </div>
      <CandlestickChart candles={data.candles} />
    </div>
  );
}

const GROUP_LABEL: Record<string, string> = { stock: "Stocks", etf: "ETFs / Funds", crypto: "Crypto" };

function SymbolGroup({ type, items, reasonMap }: { type: string; items: MarketData[]; reasonMap: Record<string, string | undefined> }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        {GROUP_LABEL[type] ?? type}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((d) => <SymbolRow key={d.symbol} data={d} reason={reasonMap[d.symbol]} />)}
      </div>
    </div>
  );
}

function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 7, padding: 2 }}>
      {RANGES.map((r) => (
        <button key={r.value} onClick={() => onChange(r.value)} style={{
          padding: "3px 10px", border: "none", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer",
          background: value === r.value ? "var(--accent)" : "transparent",
          color: value === r.value ? "white" : "var(--text-muted)",
          transition: "background 0.15s",
        }}>
          {r.label}
        </button>
      ))}
    </div>
  );
}

export default function MarketTab({ topicId }: { topicId: string }) {
  const [range, setRange] = useState<Range>("1d");
  const [indices, setIndices] = useState<MarketData[]>([]);
  const [related, setRelated] = useState<MarketData[]>([]);
  const [symbols, setSymbols] = useState<TopicMarketSymbol[]>([]);
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reExtracting, setReExtracting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [indicesError, setIndicesError] = useState<string | null>(null);

  // 用 ref 保存已加载的 symbols，供 range 切换 effect 和定时器使用，避免 stale closure
  const symbolsRef = useRef<TopicMarketSymbol[]>([]);
  // 标记初始化是否完成，避免 range change effect 在 mount 时重复触发
  const initDoneRef = useRef(false);

  const fetchIndices = useCallback(async (r: Range) => {
    setIndicesLoading(true);
    setIndicesError(null);
    try {
      setIndices(await fetchIndexData(r));
      setLastUpdated(new Date());
    } catch (e) {
      setIndicesError(String(e));
    } finally {
      setIndicesLoading(false);
    }
  }, []);

  const fetchRelated = useCallback(async (syms: TopicMarketSymbol[], r: Range) => {
    if (syms.length === 0) { setRelated([]); setRelatedLoading(false); return; }
    setRelatedLoading(true);
    try {
      setRelated(await fetchMarketData(syms.map((s) => ({ symbol: s.symbol, name: s.name, assetType: s.assetType })), r));
    } finally {
      setRelatedLoading(false);
    }
  }, []);

  // 初始化：大盘和相关资产并行，互不阻塞
  useEffect(() => {
    initDoneRef.current = false;

    // 大盘
    fetchIndices("1d");

    // 相关资产
    (async () => {
      setRelatedLoading(true);
      try {
        const symList = await getTopicSymbols(topicId);
        if (symList.length > 0) {
          setSymbols(symList);
          symbolsRef.current = symList;
          await fetchRelated(symList, "1d");
        } else if (!wasExtracted(topicId)) {
          try {
            const extracted = await extractTopicSymbols(topicId);
            setSymbols(extracted);
            symbolsRef.current = extracted;
            await fetchRelated(extracted, "1d");
          } catch {
            setRelatedLoading(false);
          } finally {
            markExtracted(topicId);
          }
        } else {
          setSymbols([]);
          symbolsRef.current = [];
          setRelatedLoading(false);
        }
      } catch {
        setRelatedLoading(false);
      } finally {
        initDoneRef.current = true;
      }
    })();
  }, [topicId, fetchIndices, fetchRelated]);

  // fetch-job-completed：后台新闻抓取完成时，重新拉取 symbols（后端已更新）并刷新行情
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<{ topicId: string }>("fetch-job-completed", (event) => {
      if (event.payload.topicId !== topicId) return;
      getTopicSymbols(topicId).then((updated) => {
        if (updated.length === 0) return;
        setSymbols(updated);
        symbolsRef.current = updated;
        fetchRelated(updated, range).catch(() => {});
      }).catch(() => {});
    }).then((u) => { unlisten = u; });
    return () => { unlisten?.(); };
  }, [topicId, range, fetchRelated]);

  // range 切换：跳过 mount，只在用户主动切换时触发
  useEffect(() => {
    if (!initDoneRef.current) return;
    fetchIndices(range);
    fetchRelated(symbolsRef.current, range);
  }, [range, fetchIndices, fetchRelated]);

  // 开盘时间每分钟静默刷新
  useEffect(() => {
    const id = setInterval(() => {
      if (!isUsMarketOpen()) return;
      fetchIndexData(range).then(setIndices).catch(() => {});
      if (symbolsRef.current.length > 0) {
        fetchMarketData(symbolsRef.current.map((s) => ({ symbol: s.symbol, name: s.name, assetType: s.assetType })), range)
          .then(setRelated).catch(() => {});
      }
      setLastUpdated(new Date());
    }, 60_000);
    return () => clearInterval(id);
  }, [range]);

  const handleReExtract = useCallback(async () => {
    setReExtracting(true);
    setRelatedLoading(true);
    try {
      localStorage.removeItem(extractionKey(topicId));
      const extracted = await extractTopicSymbols(topicId);
      setSymbols(extracted);
      symbolsRef.current = extracted;
      markExtracted(topicId);
      await fetchRelated(extracted, range);
    } catch {
      setRelatedLoading(false);
    } finally {
      setReExtracting(false);
    }
  }, [topicId, range, fetchRelated]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchIndices(range),
        fetchRelated(symbolsRef.current, range),
      ]);
    } finally {
      setRefreshing(false);
    }
    // 后台重新推荐，不阻塞价格刷新
    extractTopicSymbols(topicId).then((updated) => {
      setSymbols(updated);
      symbolsRef.current = updated;
      markExtracted(topicId);
      fetchRelated(updated, range).catch(() => {});
    }).catch(() => {});
  }, [topicId, range, fetchIndices, fetchRelated]);

  const stocks = related.filter((d) => d.assetType === "stock");
  const etfs   = related.filter((d) => d.assetType === "etf");
  const crypto = related.filter((d) => d.assetType === "crypto");
  const reasonMap: Record<string, string | undefined> = Object.fromEntries(
    symbols.map((s) => [s.symbol, s.reason])
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <RangeSelector value={range} onChange={setRange} />
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {lastUpdated && `· ${lastUpdated.toLocaleTimeString()}`}
            {isUsMarketOpen() && <span style={{ color: "#22c55e", fontWeight: 600, marginLeft: 6 }}>● US Market Open</span>}
          </div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>
          <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* 大盘 */}
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
        US Major Indices
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
        {indicesLoading
          ? <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: "var(--text-muted)", fontSize: 13 }}><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading…</div>
          : indicesError
            ? <div style={{ fontSize: 12, color: "var(--danger)" }}>{indicesError}</div>
            : indices.map((d) => <IndexCard key={d.symbol} data={d} />)
        }
      </div>

      {/* 相关资产 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Related Assets
        </div>
        <button onClick={handleReExtract} disabled={reExtracting || relatedLoading} title="Re-extract AI recommendations" style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "transparent", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer", fontSize: 11 }}>
          <Sparkles size={11} style={{ animation: reExtracting ? "spin 1s linear infinite" : "none" }} />
          {reExtracting ? "Analyzing…" : "Refresh AI picks"}
        </button>
      </div>
      {relatedLoading
        ? <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--text-muted)" }}>
            <Sparkles size={15} style={{ flexShrink: 0 }} />
            {symbols.length === 0 ? "AI is identifying related assets…" : "Loading market data…"}
          </div>
        : symbols.length === 0
          ? <div style={{ padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
              No related financial assets found for this topic.
            </div>
          : <>
              <SymbolGroup type="stock" items={stocks} reasonMap={reasonMap} />
              <SymbolGroup type="etf"   items={etfs}   reasonMap={reasonMap} />
              <SymbolGroup type="crypto" items={crypto} reasonMap={reasonMap} />
            </>
      }
    </div>
  );
}
