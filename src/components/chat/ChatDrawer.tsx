import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "../../store/ui";
import { useChatMessages, useSendChatMessage, useAddFocusPoint } from "../../lib/queries";
import type { ChatMessage } from "../../types";

// Parse [SUGGEST_FOCUS_ADD: "..."] markers from AI response
function parseSuggestions(text: string): string[] {
  const regex = /\[SUGGEST_FOCUS_ADD:\s*"([^"]+)"\]/g;
  const suggestions: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    suggestions.push(match[1]);
  }
  return suggestions;
}

function cleanText(text: string): string {
  return text.replace(/\[SUGGEST_FOCUS_ADD:\s*"[^"]+"\]/g, "").trim();
}

export default function ChatDrawer() {
  const { chatDrawerOpen, selectedTopicId, toggleChatDrawer } = useUIStore();
  const topicId = selectedTopicId;
  const { data: messages = [] } = useChatMessages(topicId);
  const sendMessage = useSendChatMessage();
  const addFocusPoint = useAddFocusPoint();
  const [input, setInput] = useState("");
  const [pendingSuggestions, setPendingSuggestions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !topicId || sendMessage.isPending) return;
    const content = input.trim();
    setInput("");

    const result = await sendMessage.mutateAsync({ topicId, content });
    // Parse any focus point suggestions from AI response
    const suggestions = parseSuggestions(result.content);
    if (suggestions.length > 0) {
      setPendingSuggestions((prev) => [...prev, ...suggestions]);
    }
  };

  const handleAddSuggestion = async (suggestion: string) => {
    if (!topicId) return;
    await addFocusPoint.mutateAsync({ topicId, text: suggestion, source: "ai" });
    setPendingSuggestions((prev) => prev.filter((s) => s !== suggestion));
  };

  return (
    <AnimatePresence>
      {chatDrawerOpen && topicId && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            bottom: 0,
            width: 380,
            background: "var(--bg-surface)",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
              AI Chat
            </span>
            <button
              onClick={toggleChatDrawer}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  marginTop: 40,
                }}
              >
                <Sparkles size={32} style={{ margin: "0 auto 12px", color: "var(--accent)" }} />
                Ask me anything about this topic
              </div>
            )}

            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            {sendMessage.isPending && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--accent-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  🤖
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px 12px 12px 2px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--text-muted)",
                    fontSize: 13,
                  }}
                >
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Focus point suggestions */}
          {pendingSuggestions.length > 0 && (
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--border)",
                background: "var(--accent-dim)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--accent-light)", marginBottom: 8, fontWeight: 600 }}>
                <Sparkles size={12} style={{ display: "inline", marginRight: 4 }} />
                AI Suggested Focus Points:
              </div>
              {pendingSuggestions.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 12, color: "var(--text-primary)" }}>{s}</span>
                  <button
                    onClick={() => handleAddSuggestion(s)}
                    style={{
                      padding: "3px 10px",
                      background: "var(--accent)",
                      border: "none",
                      borderRadius: 6,
                      color: "white",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setPendingSuggestions((prev) => prev.filter((_, j) => j !== i))}
                    style={{
                      padding: "3px 8px",
                      background: "none",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--text-muted)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 10,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about this topic..."
              style={{
                flex: 1,
                padding: "10px 14px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
                resize: "none",
              }}
              onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "var(--border-focus)")}
              onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "var(--border)")}
            />
            <button
              onClick={handleSend}
              disabled={sendMessage.isPending || !input.trim()}
              style={{
                padding: "0 14px",
                background: input.trim() ? "var(--accent)" : "var(--bg-hover)",
                border: "none",
                borderRadius: 10,
                color: input.trim() ? "white" : "var(--text-muted)",
                cursor: input.trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const displayText = isUser ? message.content : cleanText(message.content);

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        flexDirection: isUser ? "row-reverse" : "row",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: isUser ? "var(--accent)" : "var(--bg-card)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {isUser ? "👤" : "🤖"}
      </div>
      <div
        style={{
          maxWidth: "75%",
          padding: "10px 14px",
          background: isUser ? "var(--accent)" : "var(--bg-card)",
          border: isUser ? "none" : "1px solid var(--border)",
          borderRadius: isUser ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
          fontSize: 13,
          color: "var(--text-primary)",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {displayText}
      </div>
    </div>
  );
}
