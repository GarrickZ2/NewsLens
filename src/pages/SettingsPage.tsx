import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Bell, Clock, Bot, Check, Palette,
  Eye, EyeOff, Save, Globe, X, Plus, Link,
} from "lucide-react";
import ClaudeCode from "@lobehub/icons/es/ClaudeCode";
import { useSettings, useUpdateSettings } from "../lib/queries";
import { useTheme, themes } from "../context/ThemeContext";

// ── Constants ──────────────────────────────────────

const AGENT_MODELS = [
  { value: "claude-sonnet-4-6", label: "claude-sonnet-4-6", badge: "Recommended" },
  { value: "claude-opus-4-6", label: "claude-opus-4-6", badge: "Most capable" },
  { value: "claude-haiku-4-5-20251001", label: "claude-haiku-4-5-20251001", badge: "Fastest" },
  { value: "sonnet", label: "sonnet", badge: "Alias" },
  { value: "opus", label: "opus", badge: "Alias" },
];

const LANGUAGES = [
  "English", "Chinese", "Spanish", "French", "German",
  "Japanese", "Korean", "Arabic", "Portuguese", "Russian",
];

const FREQ_PRESETS = [
  { value: "every_1h", label: "1h", desc: "Every hour" },
  { value: "every_3h", label: "3h", desc: "Every 3 hours" },
  { value: "every_8h", label: "8h", desc: "Every 8 hours" },
  { value: "daily_9am", label: "9am", desc: "Daily at 9 AM" },
];

function isPreset(v: string) {
  return FREQ_PRESETS.some((p) => p.value === v);
}

// ── Main component ──────────────────────────────────

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { themeId, setTheme } = useTheme();

  const [agentModel, setAgentModel] = useState("claude-sonnet-4-6");
  const [braveApiKey, setBraveApiKey] = useState("");
  const [showBrave, setShowBrave] = useState(false);
  const [newsSources, setNewsSources] = useState<string[]>([]);
  const [newsSourceInput, setNewsSourceInput] = useState("");
  const [language, setLanguage] = useState("English");
  const [frequency, setFrequency] = useState("every_3h");
  const [notifications, setNotifications] = useState(true);
  const [discordWebhooks, setDiscordWebhooks] = useState<string[]>([]);
  const [discordInput, setDiscordInput] = useState("");
  const [slackWebhooks, setSlackWebhooks] = useState<string[]>([]);
  const [slackInput, setSlackInput] = useState("");
  const [larkWebhooks, setLarkWebhooks] = useState<string[]>([]);
  const [larkInput, setLarkInput] = useState("");
  const [telegramBots, setTelegramBots] = useState<{ token: string; chatId: string }[]>([]);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [customCron, setCustomCron] = useState("");
  const [freqMode, setFreqMode] = useState<"preset" | "custom">("preset");
  const [saved, setSaved] = useState(false);

  const [open, setOpen] = useState<Record<string, boolean>>({
    appearance: true,
    agent: true,
    content: true,
    schedule: false,
    notifications: false,
  });

  useEffect(() => {
    if (settings) {
      setAgentModel(settings.agentModel ?? "claude-sonnet-4-6");
      setBraveApiKey(settings.braveApiKey ?? "");
      const freq = settings.defaultFrequency;
      if (isPreset(freq)) {
        setFrequency(freq);
        setFreqMode("preset");
      } else {
        setCustomCron(freq);
        setFreqMode("custom");
      }
      setNotifications(settings.notificationsEnabled);
      try {
        setDiscordWebhooks(JSON.parse(settings.discordWebhooks ?? "[]") as string[]);
      } catch {
        setDiscordWebhooks([]);
      }
      try {
        setSlackWebhooks(JSON.parse(settings.slackWebhooks ?? "[]") as string[]);
      } catch {
        setSlackWebhooks([]);
      }
      try {
        setLarkWebhooks(JSON.parse(settings.larkWebhooks ?? "[]") as string[]);
      } catch {
        setLarkWebhooks([]);
      }
      try {
        setTelegramBots(JSON.parse(settings.telegramBots ?? "[]") as { token: string; chatId: string }[]);
      } catch {
        setTelegramBots([]);
      }
      setNewsSources(settings.newsSources ? settings.newsSources.split(",").map((s) => s.trim()).filter(Boolean) : []);
      setLanguage(settings.language ?? "English");
    }
  }, [settings]);

  const toggle = (key: string) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    const effectiveFreq = freqMode === "custom" ? customCron : frequency;
    await updateSettings.mutateAsync({
      agentCommand: "claude",
      agentModel,
      braveApiKey,
      defaultFrequency: effectiveFreq,
      notificationsEnabled: notifications,
      discordWebhooks: JSON.stringify(discordWebhooks),
      slackWebhooks: JSON.stringify(slackWebhooks),
      larkWebhooks: JSON.stringify(larkWebhooks),
      telegramBots: JSON.stringify(telegramBots),
      newsSources: newsSources.join(","),
      language,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const darkThemes = themes.filter((t) => t.dark);
  const lightThemes = themes.filter((t) => !t.dark);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 680, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
          Settings
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
          Configure NewsLens to match your workflow
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── Appearance ── */}
        <SettingSection
          id="appearance"
          title="Appearance"
          description={`Theme: ${themes.find((t) => t.id === themeId)?.name ?? "Default"}`}
          icon={Palette}
          iconColor="#a78bfa"
          isOpen={open.appearance}
          onToggle={() => toggle("appearance")}
        >
          <div>
            <SectionLabel>Dark themes</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
              {darkThemes.map((t) => (
                <ThemeCard key={t.id} theme={t} active={themeId === t.id} onSelect={setTheme} />
              ))}
            </div>
            <SectionLabel>Light themes</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {lightThemes.map((t) => (
                <ThemeCard key={t.id} theme={t} active={themeId === t.id} onSelect={setTheme} />
              ))}
            </div>
          </div>
        </SettingSection>

        {/* ── AI Agent ── */}
        <SettingSection
          id="agent"
          title="AI Agent"
          description="Claude Code — local CLI"
          icon={Bot}
          iconColor="#60a5fa"
          isOpen={open.agent}
          onToggle={() => toggle("agent")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Claude Code card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: "var(--accent-dim)",
                border: "1px solid var(--border-focus)",
                borderRadius: 10,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "var(--bg-hover)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <ClaudeCode.Color size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Claude Code
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  Runs locally via <code style={{ color: "var(--accent-light)", fontFamily: "monospace" }}>claude</code> CLI
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 999,
                background: "var(--accent)", fontSize: 11, color: "white", fontWeight: 500,
              }}>
                <Check size={11} />
                Active
              </div>
            </div>

            {/* Model selector */}
            <div>
              <FieldLabel>Model</FieldLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {AGENT_MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setAgentModel(m.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px",
                      background: agentModel === m.value ? "var(--accent-dim)" : "var(--bg-hover)",
                      border: `1px solid ${agentModel === m.value ? "var(--border-focus)" : "var(--border)"}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: `2px solid ${agentModel === m.value ? "var(--accent)" : "var(--border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {agentModel === m.value && (
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "monospace" }}>
                      {m.value}
                    </span>
                    <span style={{
                      marginLeft: "auto", fontSize: 11, color: "var(--text-muted)",
                      padding: "2px 7px", borderRadius: 4, background: "var(--bg-active)",
                    }}>
                      {m.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brave API key */}
            <div>
              <FieldLabel>Brave Search API Key <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></FieldLabel>
              <PasswordInput
                value={braveApiKey}
                onChange={setBraveApiKey}
                placeholder="Leave empty to use built-in WebSearch"
                show={showBrave}
                onToggle={() => setShowBrave(!showBrave)}
              />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                When set, Brave Search MCP is used. Improves search quality and saves tokens.
              </p>
            </div>
          </div>
        </SettingSection>

        {/* ── Content ── */}
        <SettingSection
          id="content"
          title="Content"
          description={`Language: ${language}${newsSources.length > 0 ? ` · ${newsSources.length} source${newsSources.length > 1 ? "s" : ""}` : " · All sources"}`}
          icon={Globe}
          iconColor="#38bdf8"
          isOpen={open.content}
          onToggle={() => toggle("content")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Language */}
            <div>
              <FieldLabel>Output Language</FieldLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    style={{
                      padding: "8px 4px",
                      background: language === lang ? "var(--accent-dim)" : "var(--bg-hover)",
                      border: `1px solid ${language === lang ? "var(--border-focus)" : "var(--border)"}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: language === lang ? 600 : 400,
                      color: language === lang ? "var(--accent)" : "var(--text-primary)",
                      transition: "all 0.12s",
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* News Sources */}
            <div>
              <FieldLabel>
                News Sources{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional — empty = all sources)</span>
              </FieldLabel>
              {/* Tag list */}
              {newsSources.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {newsSources.map((src) => (
                    <span
                      key={src}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 8px 3px 10px",
                        background: "var(--accent-dim)",
                        border: "1px solid var(--border-focus)",
                        borderRadius: 999,
                        fontSize: 12,
                        color: "var(--accent-light)",
                      }}
                    >
                      {src}
                      <button
                        onClick={() => setNewsSources((prev) => prev.filter((s) => s !== src))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, lineHeight: 0 }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newsSourceInput}
                  onChange={(e) => setNewsSourceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && newsSourceInput.trim()) {
                      e.preventDefault();
                      const val = newsSourceInput.trim().replace(/,$/, "");
                      if (val && !newsSources.includes(val)) {
                        setNewsSources((prev) => [...prev, val]);
                      }
                      setNewsSourceInput("");
                    }
                  }}
                  placeholder="e.g. Reuters, BBC, Bloomberg..."
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    const val = newsSourceInput.trim().replace(/,$/, "");
                    if (val && !newsSources.includes(val)) {
                      setNewsSources((prev) => [...prev, val]);
                      setNewsSourceInput("");
                    }
                  }}
                />
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                Press Enter or comma to add a source. AI will restrict searches to these outlets only.
              </p>
            </div>
          </div>
        </SettingSection>

        {/* ── Schedule ── */}
        <SettingSection
          id="schedule"
          title="Schedule"
          description={freqMode === "custom" ? `Custom: ${customCron}` : (FREQ_PRESETS.find((p) => p.value === frequency)?.desc ?? frequency)}
          icon={Clock}
          iconColor="#34d399"
          isOpen={open.schedule}
          onToggle={() => toggle("schedule")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {FREQ_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setFreqMode("preset"); setFrequency(p.value); }}
                  style={{
                    padding: "12px 8px",
                    background: freqMode === "preset" && frequency === p.value ? "var(--accent-dim)" : "var(--bg-hover)",
                    border: `1px solid ${freqMode === "preset" && frequency === p.value ? "var(--border-focus)" : "var(--border)"}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: freqMode === "preset" && frequency === p.value ? "var(--accent)" : "var(--text-primary)" }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{p.desc}</div>
                </button>
              ))}
              <button
                onClick={() => setFreqMode("custom")}
                style={{
                  padding: "12px 8px",
                  background: freqMode === "custom" ? "var(--accent-dim)" : "var(--bg-hover)",
                  border: `1px solid ${freqMode === "custom" ? "var(--border-focus)" : "var(--border)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: freqMode === "custom" ? "var(--accent)" : "var(--text-primary)" }}>
                  Cron
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Custom</div>
              </button>
            </div>

            <AnimatePresence>
              {freqMode === "custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ paddingTop: 4 }}>
                    <input
                      value={customCron}
                      onChange={(e) => setCustomCron(e.target.value)}
                      placeholder="e.g.  0 */6 * * *  (every 6 hours)"
                      style={{
                        ...inputStyle,
                        fontFamily: "monospace",
                        fontSize: 13,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                      Standard 5-field cron expression (minute hour day month weekday). Preset values like
                      {" "}<code style={{ color: "var(--accent-light)" }}>every_3h</code> are also accepted.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SettingSection>

        {/* ── Notifications ── */}
        <SettingSection
          id="notifications"
          title="Notifications"
          description={[
            notifications ? "Desktop alerts" : null,
            discordWebhooks.length > 0 ? `Discord (${discordWebhooks.length})` : null,
            slackWebhooks.length > 0 ? `Slack (${slackWebhooks.length})` : null,
            larkWebhooks.length > 0 ? `Lark (${larkWebhooks.length})` : null,
            telegramBots.length > 0 ? `Telegram (${telegramBots.length})` : null,
          ].filter(Boolean).join(" · ") || "No alerts configured"}
          icon={Bell}
          iconColor="#fb923c"
          isOpen={open.notifications}
          onToggle={() => toggle("notifications")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Desktop toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                  Desktop notifications
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                  macOS banner when new events are found or a fetch fails
                </div>
              </div>
              <Toggle checked={notifications} onChange={setNotifications} />
            </div>

            {/* Discord webhooks */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                {/* Discord logo mark */}
                <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="#5865F2">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                </svg>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Discord Webhooks</div>
              </div>

              {/* Existing webhooks list */}
              {discordWebhooks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {discordWebhooks.map((url, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px",
                        background: "var(--bg-hover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    >
                      <Link size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <span style={{
                        flex: 1, fontSize: 12, color: "var(--text-secondary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontFamily: "monospace",
                      }}>
                        {url}
                      </span>
                      <button
                        onClick={() => setDiscordWebhooks((prev) => prev.filter((_, i) => i !== idx))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, lineHeight: 0, flexShrink: 0 }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new webhook */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={discordInput}
                  onChange={(e) => setDiscordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const url = discordInput.trim();
                      if (url && !discordWebhooks.includes(url)) {
                        setDiscordWebhooks((prev) => [...prev, url]);
                        setDiscordInput("");
                      }
                    }
                  }}
                  placeholder="https://discord.com/api/webhooks/..."
                  style={{ ...inputStyle, flex: 1, fontSize: 12, fontFamily: "monospace" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                <button
                  onClick={() => {
                    const url = discordInput.trim();
                    if (url && !discordWebhooks.includes(url)) {
                      setDiscordWebhooks((prev) => [...prev, url]);
                      setDiscordInput("");
                    }
                  }}
                  style={{
                    padding: "0 14px", height: 40,
                    background: "var(--accent)", border: "none", borderRadius: 8,
                    color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13,
                  }}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                Get the URL from your Discord server: Channel Settings → Integrations → Webhooks.
              </p>
            </div>

            {/* Slack webhooks */}
            <WebhookListInput
              label="Slack Webhooks"
              logo={
                <svg width="18" height="18" viewBox="0 0 127 127" fill="none">
                  <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2H27v13.2h.2z" fill="#E01E5A"/>
                  <path d="M33.7 80c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/>
                  <path d="M46.9 27c-7.3 0-13.2-5.9-13.2-13.2C33.7 6.5 39.6.6 46.9.6c7.3 0 13.2 5.9 13.2 13.2V27H46.9z" fill="#36C5F0"/>
                  <path d="M46.9 33.6c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.8C6.5 60 .6 54.1.6 46.8c0-7.3 5.9-13.2 13.2-13.2h33.1z" fill="#36C5F0"/>
                  <path d="M99.8 46.8c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.8V46.8z" fill="#2EB67D"/>
                  <path d="M93.2 46.8c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.8 6.5 72.7.6 80 .6c7.3 0 13.2 5.9 13.2 13.2v33z" fill="#2EB67D"/>
                  <path d="M80 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8H80z" fill="#ECB22E"/>
                  <path d="M80 93.2c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80z" fill="#ECB22E"/>
                </svg>
              }
              items={slackWebhooks}
              onRemove={(i) => setSlackWebhooks((prev) => prev.filter((_, idx) => idx !== i))}
              inputValue={slackInput}
              onInputChange={setSlackInput}
              onAdd={() => {
                const url = slackInput.trim();
                if (url && !slackWebhooks.includes(url)) {
                  setSlackWebhooks((prev) => [...prev, url]);
                  setSlackInput("");
                }
              }}
              placeholder="https://hooks.slack.com/services/..."
              hint="Create an Incoming Webhook in your Slack app settings."
            />

            {/* Lark webhooks */}
            <WebhookListInput
              label="Lark / Feishu Webhooks"
              logo={
                <svg width="18" height="18" viewBox="0 0 200 200" fill="none">
                  <circle cx="100" cy="100" r="100" fill="#00D6B9"/>
                  <path d="M60 140 L100 60 L140 140" stroke="white" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              }
              items={larkWebhooks}
              onRemove={(i) => setLarkWebhooks((prev) => prev.filter((_, idx) => idx !== i))}
              inputValue={larkInput}
              onInputChange={setLarkInput}
              onAdd={() => {
                const url = larkInput.trim();
                if (url && !larkWebhooks.includes(url)) {
                  setLarkWebhooks((prev) => [...prev, url]);
                  setLarkInput("");
                }
              }}
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
              hint="Add a custom bot in your Lark/Feishu group: Group Settings → Bots → Add Bot."
            />

            {/* Telegram bots */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <svg width="18" height="18" viewBox="0 0 240 240" fill="#2CA5E0">
                  <circle cx="120" cy="120" r="120"/>
                  <path d="M81 128l-21-6 86-33c4-2 8 1 7 5L136 159c-1 4-5 5-8 3l-23-18-11 10c-3 3-8 1-8-3V128z" fill="white"/>
                </svg>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Telegram Bots</div>
              </div>

              {telegramBots.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {telegramBots.map((bot, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px",
                        background: "var(--bg-hover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    >
                      <Link size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <span style={{
                        flex: 1, fontSize: 12, color: "var(--text-secondary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontFamily: "monospace",
                      }}>
                        {bot.token.slice(0, 10)}… / chat: {bot.chatId}
                      </span>
                      <button
                        onClick={() => setTelegramBots((prev) => prev.filter((_, i) => i !== idx))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, lineHeight: 0, flexShrink: 0 }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="Bot Token (from @BotFather)"
                  style={{ ...inputStyle, flex: 2, fontSize: 12, fontFamily: "monospace" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                <input
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Chat ID"
                  style={{ ...inputStyle, flex: 1, fontSize: 12, fontFamily: "monospace" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                <button
                  onClick={() => {
                    const token = telegramToken.trim();
                    const chatId = telegramChatId.trim();
                    if (token && chatId) {
                      setTelegramBots((prev) => [...prev, { token, chatId }]);
                      setTelegramToken("");
                      setTelegramChatId("");
                    }
                  }}
                  style={{
                    padding: "0 14px", height: 40, flexShrink: 0,
                    background: "var(--accent)", border: "none", borderRadius: 8,
                    color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13,
                  }}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                Create a bot via <code style={{ color: "var(--accent-light)" }}>@BotFather</code>, then get your Chat ID via <code style={{ color: "var(--accent-light)" }}>@userinfobot</code>.
              </p>
            </div>
          </div>
        </SettingSection>

        {/* Save button */}
        <div style={{ paddingTop: 8 }}>
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            style={{
              padding: "10px 24px",
              minWidth: 160,
              background: saved ? "var(--success, #22c55e)" : "var(--accent)",
              border: "none",
              borderRadius: 8,
              color: "white",
              cursor: updateSettings.isPending ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.2s, opacity 0.2s",
              opacity: updateSettings.isPending ? 0.7 : 1,
            }}
          >
            <Save size={15} />
            {saved ? "Saved!" : updateSettings.isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────

function SettingSection({
  title, description, icon: Icon, iconColor,
  isOpen, onToggle, children,
}: {
  id?: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
      background: "var(--bg-surface)",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${iconColor}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{description}</div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              padding: "0 18px 18px",
              borderTop: "1px solid var(--border)",
              paddingTop: 16,
            }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeCard({
  theme, active, onSelect,
}: {
  theme: { id: string; name: string; dots: [string, string, string] };
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(theme.id)}
      style={{
        padding: "10px 8px",
        background: active ? "var(--accent-dim)" : "var(--bg-hover)",
        border: `1px solid ${active ? "var(--border-focus)" : "var(--border)"}`,
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "center",
        position: "relative",
        transition: "all 0.15s",
      }}
    >
      {active && (
        <div style={{
          position: "absolute", top: 5, right: 5,
          width: 14, height: 14, borderRadius: "50%",
          background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Check size={8} color="white" />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 6 }}>
        {theme.dots.map((color, i) => (
          <div
            key={i}
            style={{ width: 10, height: 10, borderRadius: "50%", background: color, border: "1px solid rgba(128,128,128,0.2)" }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: active ? "var(--accent)" : "var(--text-muted)", fontWeight: active ? 600 : 400, lineHeight: 1.2 }}>
        {theme.name}
      </div>
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, padding: 0,
        background: checked ? "var(--accent)" : "var(--bg-active)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          position: "absolute",
          top: 3, width: 18, height: 18, borderRadius: "50%",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function PasswordInput({ value, onChange, placeholder, show, onToggle }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingRight: 42 }}
        onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      <button
        onClick={onToggle}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4,
        }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function WebhookListInput({
  label, logo, items, onRemove, inputValue, onInputChange, onAdd, placeholder, hint,
}: {
  label: string;
  logo: React.ReactNode;
  items: string[];
  onRemove: (i: number) => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
  hint: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {logo}
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</div>
      </div>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {items.map((url, idx) => (
            <div
              key={idx}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px",
                background: "var(--bg-hover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              <Link size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span style={{
                flex: 1, fontSize: 12, color: "var(--text-secondary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontFamily: "monospace",
              }}>
                {url}
              </span>
              <button
                onClick={() => onRemove(idx)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, lineHeight: 0, flexShrink: 0 }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
          placeholder={placeholder}
          style={{ ...inputStyle, flex: 1, fontSize: 12, fontFamily: "monospace" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <button
          onClick={onAdd}
          style={{
            padding: "0 14px", height: 40,
            background: "var(--accent)", border: "none", borderRadius: 8,
            color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13,
          }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
        {hint}
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", boxSizing: "border-box",
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.15s",
};
