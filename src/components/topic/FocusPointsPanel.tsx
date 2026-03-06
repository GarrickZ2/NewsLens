import { useState } from "react";
import { Plus, Trash2, Target, Sparkles } from "lucide-react";
import { useFocusPoints, useAddFocusPoint, useDeleteFocusPoint } from "../../lib/queries";

export default function FocusPointsPanel({ topicId }: { topicId: string }) {
  const { data: points = [] } = useFocusPoints(topicId);
  const addPoint = useAddFocusPoint();
  const deletePoint = useDeleteFocusPoint();
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await addPoint.mutateAsync({ topicId, text: newText.trim(), source: "manual" });
    setNewText("");
    setAdding(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Focus Points
        </h3>
        <button
          onClick={() => setAdding(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {points.map((point) => (
          <div
            key={point.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 12px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
            onMouseEnter={(e) => {
              const btn = (e.currentTarget as HTMLElement).querySelector(".del-btn") as HTMLElement;
              if (btn) btn.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              const btn = (e.currentTarget as HTMLElement).querySelector(".del-btn") as HTMLElement;
              if (btn) btn.style.opacity = "0";
            }}
          >
            {point.source === "ai" ? (
              <Sparkles size={14} style={{ color: "var(--accent-light)", marginTop: 2, flexShrink: 0 }} />
            ) : (
              <Target size={14} style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>
              {point.text}
            </span>
            <button
              className="del-btn"
              onClick={() => deletePoint.mutate({ id: point.id, topicId })}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 2,
                opacity: 0,
                transition: "opacity 0.1s",
                flexShrink: 0,
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {adding && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewText(""); }
              }}
              placeholder="What to focus on..."
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-focus)",
                borderRadius: 8,
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={handleAdd}
              disabled={addPoint.isPending}
              style={{
                padding: "8px 14px",
                background: "var(--accent)",
                border: "none",
                borderRadius: 8,
                color: "white",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Add
            </button>
          </div>
        )}

        {points.length === 0 && !adding && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              border: "1px dashed var(--border)",
              borderRadius: 8,
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No focus points. Add aspects to pay attention to.
          </div>
        )}
      </div>
    </div>
  );
}
