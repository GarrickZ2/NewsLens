import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useUIStore } from "../../store/ui";
import { useCreateTopic, useSettings } from "../../lib/queries";

const EMOJIS = [
  // News & Media
  "📰", "🗞️", "📺", "📡", "📻", "📝", "🎙️", "📸",
  // Finance & Business
  "💼", "💰", "📈", "📉", "💹", "🏦", "💳", "🏢",
  // World & Geo
  "🌍", "🌎", "🌏", "🗺️", "🌐", "✈️", "🧭", "🏔️",
  // Tech & Science
  "💻", "🤖", "🔬", "🛰️", "⚡", "🔭", "🧬", "📱",
  // Government & Law
  "🏛️", "⚖️", "🗳️", "📜", "🔏", "🚔", "🏳️", "🎖️",
  // Target & Stats
  "🎯", "📊", "📋", "🏆", "🥇", "🔎", "💡", "🧩",
  // Security & Risk
  "🛡️", "🔒", "⚠️", "🚨", "🔥", "💣", "🩺", "🧯",
  // Environment & Society
  "🌿", "☀️", "🌊", "🏗️", "🤝", "👥", "🏠", "🚀",
];

const FREQ_PRESETS = [
  { value: "every_1h",  label: "1h",  desc: "Every hour" },
  { value: "every_3h",  label: "3h",  desc: "Every 3 h" },
  { value: "every_8h",  label: "8h",  desc: "Every 8 h" },
  { value: "daily_9am", label: "9am", desc: "Daily 9 AM" },
];


const PRESET_VALUES = FREQ_PRESETS.map((p) => p.value);

export default function CreateTopicModal() {
  const { closeCreateModal } = useUIStore();
  const createTopic = useCreateTopic();
  const { data: settings } = useSettings();

  const [emoji, setEmoji] = useState("📰");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [freqMode, setFreqMode] = useState<"preset" | "custom">("preset");
  const [frequency, setFrequency] = useState("every_3h");
  const [customCron, setCustomCron] = useState("");

  // 从 Settings 同步默认频率（只在第一次加载时）
  useEffect(() => {
    if (!settings) return;
    const def = settings.defaultFrequency;
    if (PRESET_VALUES.includes(def)) {
      setFrequency(def);
      setFreqMode("preset");
    } else if (def) {
      setCustomCron(def);
      setFreqMode("custom");
    }
  }, [settings]);

  const effectiveFreq = freqMode === "custom" ? customCron : frequency;
  const canCreate = name.trim() && description.trim() && (freqMode === "preset" || customCron.trim());

  const handleCreate = async () => {
    if (!canCreate) return;
    await createTopic.mutateAsync({
      name: name.trim(),
      emoji,
      description: description.trim(),
      cronSchedule: effectiveFreq,
    });
    closeCreateModal();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 200,
        }}
        onClick={closeCreateModal}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "24px 24px 20px",
            width: 520,
            maxWidth: "92vw",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
              New Topic
            </h2>
            <button
              onClick={closeCreateModal}
              style={{
                background: "none", border: "none",
                color: "var(--text-muted)", cursor: "pointer", padding: 6,
                borderRadius: 6, lineHeight: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Emoji picker */}
            <div>
              <FieldLabel>Emoji</FieldLabel>
              <div style={{ height: 160, overflowY: "auto", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, padding: 6 }}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    style={{
                      height: 40, fontSize: 20,
                      background: emoji === e ? "var(--accent-dim)" : "var(--bg-card)",
                      border: `1.5px solid ${emoji === e ? "var(--border-focus)" : "var(--border)"}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.12s",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Topic name..."
                autoFocus
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Description */}
            <div>
              <FieldLabel>Description</FieldLabel>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should be monitored..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
                onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Frequency */}
            <div>
              <FieldLabel>Check Frequency</FieldLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
                {FREQ_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setFreqMode("preset"); setFrequency(p.value); }}
                    style={{
                      padding: "10px 4px",
                      background: freqMode === "preset" && frequency === p.value ? "var(--accent-dim)" : "var(--bg-card)",
                      border: `1.5px solid ${freqMode === "preset" && frequency === p.value ? "var(--border-focus)" : "var(--border)"}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: freqMode === "preset" && frequency === p.value ? "var(--accent)" : "var(--text-primary)",
                    }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{p.desc}</div>
                  </button>
                ))}
                <button
                  onClick={() => setFreqMode("custom")}
                  style={{
                    padding: "10px 4px",
                    background: freqMode === "custom" ? "var(--accent-dim)" : "var(--bg-card)",
                    border: `1.5px solid ${freqMode === "custom" ? "var(--border-focus)" : "var(--border)"}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.12s",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: freqMode === "custom" ? "var(--accent)" : "var(--text-primary)" }}>
                    Cron
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Custom</div>
                </button>
              </div>

              <AnimatePresence>
                {freqMode === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: "hidden" }}
                  >
                    <input
                      value={customCron}
                      onChange={(e) => setCustomCron(e.target.value)}
                      placeholder="e.g.  0 */6 * * *"
                      style={{ ...inputStyle, marginTop: 8, fontFamily: "monospace", fontSize: 13 }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              onClick={closeCreateModal}
              style={{
                flex: 1, padding: "11px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-secondary)",
                cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createTopic.isPending || !canCreate}
              style={{
                flex: 2, padding: "11px",
                background: "var(--accent)",
                border: "none", borderRadius: 8,
                color: "white",
                cursor: createTopic.isPending || !canCreate ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: createTopic.isPending || !canCreate ? 0.65 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {createTopic.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
              {createTopic.isPending ? "Creating…" : "Create Topic"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", boxSizing: "border-box",
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.15s",
};
