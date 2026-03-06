import { Home, Archive, Settings, BarChart3, Plus, ChevronDown, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { useUIStore } from "../../store/ui";
import { useTopics } from "../../lib/queries";
import type { Topic } from "../../types";

const EXPANDED_WIDTH = 220;
const COLLAPSED_WIDTH = 56;

export default function Sidebar() {
  const {
    currentPage, selectedTopicId, topicsMenuOpen, sidebarCollapsed, fetchingTopics,
    setPage, toggleTopicsMenu, openCreateModal, toggleSidebar,
  } = useUIStore();
  const { data: topics = [], isLoading } = useTopics();

  const activeTopics = topics.filter((t) => t.status === "active");
  const collapsed = sidebarCollapsed;
  const w = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        overflowX: "hidden",
        transition: "width 0.2s ease, min-width 0.2s ease, max-width 0.2s ease",
        userSelect: "none",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? "16px 0" : "16px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          flexShrink: 0,
        }}
      >
        {collapsed ? (
          <button
            onClick={toggleSidebar}
            title="Expand sidebar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            🔭
          </button>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                🔭
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                NewsLens
              </span>
            </div>
            <button
              onClick={toggleSidebar}
              title="Collapse sidebar"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 4,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={16} />
            </button>
          </>
        )}
      </div>

      {/* Scrollable nav area */}
      <nav
        style={{
          flex: 1,
          overflow: "auto",
          overflowX: "hidden",
          padding: "6px 0",
        }}
      >
        {/* Overview */}
        <NavItem
          icon={<Home size={16} />}
          label="Overview"
          active={currentPage === "home"}
          onClick={() => setPage("home")}
          collapsed={collapsed}
        />

        {/* Topics section — hidden when collapsed */}
        {!collapsed && (
          <div>
            <button
              onClick={toggleTopicsMenu}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {topicsMenuOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <span>Topics</span>
              <button
                onClick={(e) => { e.stopPropagation(); openCreateModal(); }}
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 4,
                }}
                title="New Topic"
              >
                <Plus size={13} />
              </button>
            </button>

            {topicsMenuOpen && (
              <div>
                {isLoading ? (
                  <div style={{ padding: "8px 20px", color: "var(--text-muted)" }}>
                    <Loader2 size={13} className="animate-spin" />
                  </div>
                ) : activeTopics.length === 0 ? (
                  <div style={{ padding: "6px 20px", color: "var(--text-muted)", fontSize: 12 }}>
                    No topics yet
                  </div>
                ) : (
                  activeTopics.map((topic) => (
                    <TopicItem
                      key={topic.id}
                      topic={topic}
                      active={selectedTopicId === topic.id}
                      fetching={fetchingTopics.has(topic.id)}
                      onClick={() => setPage("topic", topic.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* When collapsed: show a + icon for new topic */}
        {collapsed && (
          <button
            onClick={openCreateModal}
            title="New Topic"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 0",
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
          </button>
        )}
      </nav>

      {/* Bottom pinned nav: Statistics → Archive → Settings */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "6px 0",
          flexShrink: 0,
        }}
      >
        <NavItem
          icon={<BarChart3 size={16} />}
          label="Statistics"
          active={currentPage === "statistics"}
          onClick={() => setPage("statistics")}
          collapsed={collapsed}
        />
        <NavItem
          icon={<Archive size={16} />}
          label="Archive"
          active={currentPage === "archive"}
          onClick={() => setPage("archive")}
          collapsed={collapsed}
        />
        <NavItem
          icon={<Settings size={16} />}
          label="Settings"
          active={currentPage === "settings"}
          onClick={() => setPage("settings")}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}

function NavItem({
  icon, label, active, onClick, collapsed,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        width: collapsed ? "100%" : "calc(100% - 16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 9,
        padding: collapsed ? "9px 0" : "7px 12px",
        background: active ? "var(--bg-active)" : "none",
        border: "none",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        textAlign: "left",
        borderRadius: collapsed ? 0 : 6,
        margin: collapsed ? 0 : "1px 8px",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {icon}
      {!collapsed && label}
    </button>
  );
}

function TopicItem({
  topic, active, fetching, onClick,
}: {
  topic: Topic;
  active: boolean;
  fetching: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "calc(100% - 16px)",
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 10px",
        background: active ? "var(--bg-active)" : "none",
        border: "none",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        cursor: "pointer",
        fontSize: 13,
        textAlign: "left",
        borderRadius: 6,
        margin: "1px 8px",
        overflow: "hidden",
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0 }}>{topic.emoji}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {topic.name}
      </span>
      {fetching && (
        <Loader2
          size={11}
          style={{ flexShrink: 0, color: "var(--accent)", animation: "spin 1s linear infinite" }}
        />
      )}
    </button>
  );
}
