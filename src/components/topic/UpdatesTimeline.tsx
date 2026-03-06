import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Clock, ExternalLink, ChevronDown, ChevronUp, FileText, Zap, CheckCircle,
  Plus, Minus, ArrowUp, GitFork, ArrowLeft, List, Layers,
} from "lucide-react";
import { useNewsEvents, useUpdates } from "../../lib/queries";
import type { NewsEvent, Topic, Update } from "../../types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function fmtDateShort(iso: string) {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

// ── Chain building ─────────────────────────────────────────────────────────────

interface Chain {
  rootId: string;
  root: NewsEvent;
  children: NewsEvent[];   // sorted asc by date
  allEvents: NewsEvent[];  // [root, ...children]
  latestDate: string;
  isResolved: boolean;
}

function buildChains(events: NewsEvent[]): {
  chains: Chain[];
  childrenMap: Map<string, NewsEvent[]>;
} {
  const childrenMap = new Map<string, NewsEvent[]>();
  events.forEach((e) => {
    if (e.parentEventId) {
      if (!childrenMap.has(e.parentEventId)) childrenMap.set(e.parentEventId, []);
      childrenMap.get(e.parentEventId)!.push(e);
    }
  });

  const roots = events.filter((e) => !e.parentEventId);
  const chains: Chain[] = roots.map((root) => {
    const children = (childrenMap.get(root.id) ?? []).sort((a, b) =>
      (a.occurredAt ?? a.firstSeenAt).localeCompare(b.occurredAt ?? b.firstSeenAt)
    );
    const allEvents = [root, ...children];
    const latestDate = allEvents.map((e) => e.lastUpdatedAt).sort().reverse()[0];
    const isResolved = children.some((e) => e.eventType === "resolution") || root.status === "resolved";
    return { rootId: root.id, root, children, allEvents, latestDate, isResolved };
  }).sort((a, b) => b.latestDate.localeCompare(a.latestDate));

  return { chains, childrenMap };
}

// ── Summary Card ───────────────────────────────────────────────────────────────

function SummaryCard({ topic }: { topic: Topic }) {
  if (!topic.summary) return null;
  const date = topic.summaryUpdatedAt ? fmtDate(topic.summaryUpdatedAt) : null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        <FileText size={12} />
        <span>Latest Summary</span>
        {date && <span style={{ marginLeft: "auto", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>{date}</span>}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{topic.summary}</p>
    </div>
  );
}

// ── Type Badge ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  new:        { label: "NEW",        color: "var(--success, #22c55e)", bg: "rgba(34,197,94,0.12)",  icon: Plus },
  escalation: { label: "ESCALATION", color: "var(--warning, #f59e0b)", bg: "rgba(245,158,11,0.12)", icon: Zap },
  resolution: { label: "RESOLVED",   color: "var(--text-muted)",       bg: "var(--bg-hover)",        icon: CheckCircle },
} as const;

function TypeBadge({ type, small }: { type: NewsEvent["eventType"]; small?: boolean }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.new;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: small ? 9 : 10, fontWeight: 700,
      padding: small ? "1px 6px" : "2px 8px",
      borderRadius: 999, background: cfg.bg, color: cfg.color,
      letterSpacing: "0.06em", flexShrink: 0,
    }}>
      <Icon size={small ? 8 : 10} />
      {cfg.label}
    </span>
  );
}

// ── No-Change Marker ───────────────────────────────────────────────────────────

function NoChangeMarker({ date }: { date: string }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
        <div style={{ width: 1, height: 12, borderLeft: "1px solid var(--border)" }} />
        <Minus size={10} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <div style={{ width: 1, flex: 1, minHeight: 12, borderLeft: "1px solid var(--border)" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", paddingBottom: 8, display: "flex", alignItems: "center", gap: 5, userSelect: "none" }}>
        <span>No update</span>
        <span>·</span>
        <Clock size={10} />
        <span>{fmtDate(date)}</span>
      </div>
    </div>
  );
}

// ── Event Card ─────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: NewsEvent;
  parentTitle: string | null;
  dashedAbove: boolean;
  dashedBelow: boolean;
  isPartOfChain?: boolean;
  onViewThread?: () => void;
  isLast?: boolean;
}

function EventCard({ event, parentTitle, dashedAbove, dashedBelow, isPartOfChain, onViewThread, isLast }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const dotColor =
    event.eventType === "new"        ? "var(--success, #22c55e)"
    : event.eventType === "escalation" ? "var(--warning, #f59e0b)"
    : "var(--text-muted)";

  const primaryDate = event.occurredAt ? fmtDate(event.occurredAt) : fmtDate(event.firstSeenAt);
  const detectedDate = event.occurredAt ? fmtDate(event.firstSeenAt) : null;

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* Timeline column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
        <div style={{ width: 1, height: 20, borderLeft: `1px ${dashedAbove ? "dashed" : "solid"} var(--border)` }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, border: `2px solid ${dotColor}`, flexShrink: 0 }} />
        {!isLast && (
          <div style={{ width: 1, flex: 1, borderLeft: `1px ${dashedBelow ? "dashed" : "solid"} var(--border)` }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 12 }}>
        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} />
            {primaryDate}
          </span>
          {detectedDate && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }} title="Detected at">
              · detected {detectedDate}
            </span>
          )}
          <TypeBadge type={event.eventType} />
          {event.status === "resolved" && (
            <span style={{ fontSize: 10, padding: "2px 8px", background: "var(--bg-hover)", borderRadius: 999, color: "var(--text-muted)" }}>
              resolved
            </span>
          )}
          {/* Thread button — only for events that are part of a chain */}
          {isPartOfChain && onViewThread && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewThread(); }}
              title="View full thread"
              style={{
                marginLeft: "auto", display: "flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 6,
                background: "var(--bg-hover)", border: "1px solid var(--border)",
                color: "var(--text-muted)", cursor: "pointer", fontSize: 11,
              }}
            >
              <GitFork size={10} />
              Thread
            </button>
          )}
        </div>

        {/* Parent context chip */}
        {parentTitle && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, color: "var(--text-muted)",
            background: "var(--bg-hover)", border: "1px solid var(--border)",
            borderRadius: 6, padding: "2px 8px", marginBottom: 6,
          }}>
            <ArrowUp size={10} />
            {event.eventType === "resolution" ? "Resolution of" : "Escalation of"}:&nbsp;
            <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>{parentTitle}</span>
          </div>
        )}

        {/* Card */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: expanded ? 0 : 4 }}>
                {event.title}
              </div>
              {!expanded && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {event.summary}
                </div>
              )}
            </div>
            <div style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          </button>

          {expanded && (
            <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
              <div className="md-body" style={{ paddingTop: 12 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.summary}</ReactMarkdown>
              </div>
            </div>
          )}

          {event.sources.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => setSourcesOpen((v) => !v)}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 11 }}
              >
                {sourcesOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Sources ({event.sources.length})</span>
              </button>
              {sourcesOpen && (
                <div style={{ padding: "0 16px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {event.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent-light)", padding: "3px 8px", background: "var(--accent-dim)", borderRadius: 6, textDecoration: "none" }}
                    >
                      <ExternalLink size={11} />
                      {s.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chain Summary Card (Threads overview) ──────────────────────────────────────

function ChainSummaryCard({ chain, onFocus }: { chain: Chain; onFocus: () => void }) {
  const startDate = fmtDateShort(chain.root.occurredAt ?? chain.root.firstSeenAt);
  const endDate = chain.children.length > 0
    ? fmtDateShort(chain.children[chain.children.length - 1].occurredAt ?? chain.children[chain.children.length - 1].firstSeenAt)
    : null;

  const dotColor =
    chain.isResolved ? "var(--text-muted)"
    : chain.children.some(e => e.eventType === "escalation") ? "var(--warning, #f59e0b)"
    : "var(--success, #22c55e)";

  return (
    <button
      onClick={onFocus}
      style={{
        width: "100%", textAlign: "left", background: "var(--bg-card)",
        border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px",
        cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
        display: "flex", gap: 12, alignItems: "flex-start",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-focus)"; e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card)"; }}
    >
      {/* Status dot */}
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 4 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row: badges + date */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
          {/* Event type progression */}
          {chain.allEvents.map((e, i) => (
            <span key={e.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>→</span>}
              <TypeBadge type={e.eventType} small />
            </span>
          ))}
          {chain.isResolved && (
            <span style={{ fontSize: 10, padding: "1px 6px", background: "var(--bg-hover)", borderRadius: 999, color: "var(--text-muted)" }}>
              closed
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {endDate && endDate !== startDate ? `${startDate} – ${endDate}` : startDate}
          </span>
        </div>

        {/* Root event title */}
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 4 }}>
          {chain.root.title}
        </div>

        {/* Children preview */}
        {chain.children.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
            {chain.children.slice(0, 2).map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                <TypeBadge type={e.eventType} small />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
              </div>
            ))}
            {chain.children.length > 2 && (
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                +{chain.children.length - 2} more…
              </div>
            )}
          </div>
        )}
      </div>

      <ChevronDown size={14} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
    </button>
  );
}

// ── Thread Detail (focused single chain, ascending) ────────────────────────────

function ThreadDetail({ chain, onBack, eventById }: {
  chain: Chain;
  onBack: () => void;
  eventById: Map<string, NewsEvent>;
}) {
  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", fontSize: 13, padding: 0,
        }}
      >
        <ArrowLeft size={14} />
        All threads
      </button>

      {/* Chain header */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "12px 16px", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      }}>
        <GitFork size={13} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
          {chain.root.title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {chain.allEvents.map((e, i) => (
            <span key={e.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>→</span>}
              <TypeBadge type={e.eventType} small />
            </span>
          ))}
        </div>
      </div>

      {/* Events in descending order: most recent first */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {[...chain.allEvents].reverse().map((event, idx, arr) => {
          const prev = idx > 0 ? arr[idx - 1] : null; // newer (above)
          const next = idx < arr.length - 1 ? arr[idx + 1] : null; // older (below)
          // Descending: prev (above) is my child, next (below) is my parent
          const dashedAbove = !!prev && prev.parentEventId === event.id;
          const dashedBelow = !!next && event.parentEventId === next.id;
          const parentTitle = event.parentEventId
            ? (eventById.get(event.parentEventId)?.title ?? null)
            : null;

          return (
            <EventCard
              key={event.id}
              event={event}
              parentTitle={parentTitle}
              dashedAbove={dashedAbove}
              dashedBelow={dashedBelow}
              isLast={idx === arr.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── View Toggle ────────────────────────────────────────────────────────────────

function ViewToggle({
  mode, onChange,
}: {
  mode: "feed" | "threads";
  onChange: (m: "feed" | "threads") => void;
}) {
  const btn = (m: "feed" | "threads", Icon: React.ElementType, label: string) => (
    <button
      onClick={() => onChange(m)}
      style={{
        display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
        background: mode === m ? "var(--accent-dim)" : "none",
        border: `1px solid ${mode === m ? "var(--border-focus)" : "var(--border)"}`,
        borderRadius: 6, cursor: "pointer",
        color: mode === m ? "var(--accent)" : "var(--text-muted)",
        fontSize: 12, fontWeight: mode === m ? 600 : 400,
      }}
    >
      <Icon size={12} />
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {btn("feed", List, "Feed")}
      {btn("threads", Layers, "Threads")}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type TimelineItem =
  | { kind: "event";     data: NewsEvent; sortKey: string }
  | { kind: "no-change"; data: Update;    sortKey: string };

export default function UpdatesTimeline({ topicId, topic }: { topicId: string; topic: Topic }) {
  const [viewMode, setViewMode] = useState<"feed" | "threads">("feed");
  const [focusedRootId, setFocusedRootId] = useState<string | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useNewsEvents(topicId);
  const { data: updates = [], isLoading: updatesLoading } = useUpdates(topicId);

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const { chains, childrenMap } = useMemo(() => buildChains(events), [events]);
  const chainByRootId = useMemo(() => new Map(chains.map((c) => [c.rootId, c])), [chains]);

  if (eventsLoading || updatesLoading) {
    return <div style={{ padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>Loading...</div>;
  }

  const isEmpty = events.length === 0 && !topic.summary;

  function isPartOfChain(event: NewsEvent): boolean {
    return !!event.parentEventId || (childrenMap.get(event.id)?.length ?? 0) > 0;
  }

  function getRootId(event: NewsEvent): string {
    return event.parentEventId ?? event.id;
  }

  function handleViewThread(event: NewsEvent) {
    const rootId = getRootId(event);
    setFocusedRootId(rootId);
    setViewMode("threads");
  }

  // ── Feed mode ──
  const feedItems: TimelineItem[] = [
    ...events.map((e) => ({ kind: "event" as const, data: e, sortKey: e.occurredAt ?? e.firstSeenAt })),
    ...updates.filter((u) => u.noChange).map((u) => ({ kind: "no-change" as const, data: u, sortKey: u.createdAt })),
  ].sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));

  return (
    <div>
      <SummaryCard topic={topic} />

      {/* Header row */}
      {!isEmpty && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Event Timeline
          </span>
          <div style={{ marginLeft: "auto" }}>
            <ViewToggle
              mode={viewMode}
              onChange={(m) => { setViewMode(m); setFocusedRootId(null); }}
            />
          </div>
        </div>
      )}

      {isEmpty && (
        <div style={{ padding: 32, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text-muted)", fontSize: 13 }}>
          No events yet. Trigger a fetch to get started.
        </div>
      )}

      {/* ── Feed mode ── */}
      {viewMode === "feed" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {feedItems.map((item, idx) => {
            if (item.kind === "no-change") {
              return <NoChangeMarker key={`nc-${item.data.id}`} date={item.data.createdAt} />;
            }

            const event = item.data;
            const prevItem = idx > 0 ? feedItems[idx - 1] : null;
            const nextItem = idx < feedItems.length - 1 ? feedItems[idx + 1] : null;

            const dashedAbove =
              prevItem?.kind === "event" &&
              prevItem.data.parentEventId === event.id;
            const dashedBelow =
              !!event.parentEventId &&
              nextItem?.kind === "event" &&
              nextItem.data.id === event.parentEventId;
            const parentTitle = event.parentEventId
              ? (eventById.get(event.parentEventId)?.title ?? null)
              : null;

            return (
              <EventCard
                key={event.id}
                event={event}
                parentTitle={parentTitle}
                dashedAbove={dashedAbove}
                dashedBelow={dashedBelow}
                isLast={idx === feedItems.length - 1}
                isPartOfChain={isPartOfChain(event)}
                onViewThread={() => handleViewThread(event)}
              />
            );
          })}
        </div>
      )}

      {/* ── Threads mode: overview ── */}
      {viewMode === "threads" && !focusedRootId && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {chains.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text-muted)", fontSize: 13 }}>
              No events yet.
            </div>
          )}
          {chains.map((chain) => (
            <ChainSummaryCard
              key={chain.rootId}
              chain={chain}
              onFocus={() => setFocusedRootId(chain.rootId)}
            />
          ))}
        </div>
      )}

      {/* ── Threads mode: focused chain ── */}
      {viewMode === "threads" && focusedRootId && (() => {
        const chain = chainByRootId.get(focusedRootId);
        if (!chain) return null;
        return (
          <ThreadDetail
            chain={chain}
            onBack={() => setFocusedRootId(null)}
            eventById={eventById}
          />
        );
      })()}
    </div>
  );
}
