import { useState, useCallback } from "react";

// ─── Models config ────────────────────────────────────────────────────────────
// Gemini  → Google AI API  (free tier, key from aistudio.google.com)
// Llama   → Groq API       (free tier, key from console.groq.com)

const MODELS = [
  {
    id:       "gemini",
    label:    "Gemini 2.0 Flash",
    sublabel: "gemini-2.0-flash",
    tag:      "Google",
    free:     true,
    color:    "#059669",
    bg:       "#d1fae5",
    icon:     "◆",
    keyId:    "google",
    keyLabel: "Google AI Studio Key",
    keyLink:  "https://aistudio.google.com/app/apikey",
    keyHint:  "AIza…",
  },
  {
    id:       "llama",
    label:    "Llama 3.3 70B",
    sublabel: "llama-3.3-70b-versatile",
    tag:      "Groq",
    free:     true,
    color:    "#7c3aed",
    bg:       "#ede9fe",
    icon:     "◎",
    keyId:    "groq",
    keyLabel: "Groq API Key",
    keyLink:  "https://console.groq.com/keys",
    keyHint:  "gsk_…",
  },
  {
    id:       "llama8b",
    label:    "Llama 3.1 8B",
    sublabel: "llama-3.1-8b-instant",
    tag:      "Groq",
    free:     true,
    color:    "#0891b2",
    bg:       "#cffafe",
    icon:     "◇",
    keyId:    "groq",
    keyLabel: "Groq API Key",
    keyLink:  "https://console.groq.com/keys",
    keyHint:  "gsk_…",
  },
];

const PLATFORMS = [
  { id: "linkedin",    label: "LinkedIn",    icon: "🔗", color: "#0077b5" },
  { id: "instagram",   label: "Instagram",   icon: "📸", color: "#e1306c" },
  { id: "infographic", label: "Infographic", icon: "📊", color: "#059669" },
];

const TONES = [
  "Professional", "Conversational", "Inspiring", "Educational", "Witty",
];

const INDUSTRIES = [
  "Technology", "Manufacturing", "Oil & Gas", "Finance", "Healthcare",
  "Energy", "Construction", "Data & AI", "Automation & OT",
];

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(topic, platform, tone, industry, keywords, modelId) {
  const kw = keywords ? `Keywords to include: ${keywords}.` : "";
  const persona =
    modelId === "gemini" ? "You are Gemini by Google — helpful, precise, and well-structured." :
    modelId === "llama"  ? "You are Llama 3 by Meta — direct, clear, and insightful." : "";

  if (platform === "linkedin") {
    return `${persona}
Write a ${tone.toLowerCase()} LinkedIn post for a ${industry} professional about: "${topic}".
${kw}
Format rules:
- Start with a strong hook sentence
- Write 3-4 insight paragraphs
- End with 3-5 relevant hashtags
- Maximum 1300 characters
- Plain text only — no markdown headers, no bullet symbols`;
  }

  if (platform === "instagram") {
    return `${persona}
Write a ${tone.toLowerCase()} Instagram caption for the ${industry} industry about: "${topic}".
${kw}
Format rules:
- Punchy attention-grabbing opener
- 2-3 short paragraphs with emojis woven in naturally
- Finish with 8-12 trending hashtags
- Maximum 2200 characters`;
  }

  if (platform === "infographic") {
    return `${persona}
Create infographic content for a ${industry} audience about: "${topic}".
${kw}
IMPORTANT: Respond with ONLY a raw JSON object. No markdown fences, no explanation, no text before or after the JSON.
Use exactly this structure:
{"title":"short punchy title","subtitle":"one line subtitle","stats":[{"value":"X%","label":"stat label"},{"value":"$Xbn","label":"stat label"},{"value":"Xyr","label":"stat label"}],"points":["insight one","insight two","insight three","insight four"],"cta":"call to action text","footer":"source or tagline"}`;
  }
}

// ─── API Callers ──────────────────────────────────────────────────────────────

async function callGemini(prompt, key) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1000 },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Gemini error " + res.status);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

async function callGroq(prompt, key, model) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": "Bearer " + key,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Groq error " + res.status);
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned empty content");
  return text;
}

async function callAPI(modelId, prompt, keys) {
  switch (modelId) {
    case "gemini":
      if (!keys.google) throw new Error("Google AI Studio key not set — get it free at aistudio.google.com");
      return callGemini(prompt, keys.google);
    case "llama":
      if (!keys.groq) throw new Error("Groq API key not set — get it free at console.groq.com");
      return callGroq(prompt, keys.groq, "llama3-70b-8192");
    case "llama8b":
      if (!keys.groq) throw new Error("Groq API key not set — get it free at console.groq.com");
      return callGroq(prompt, keys.groq, "llama-3.1-8b-instant");
    default:
      throw new Error("Unknown model: " + modelId);
  }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadKeys() {
  try { return JSON.parse(localStorage.getItem("forge_keys") || "{}"); }
  catch { return {}; }
}
function saveKeys(keys) {
  localStorage.setItem("forge_keys", JSON.stringify(keys));
}

// ─── Custom Multi-Select Dropdown ─────────────────────────────────────────────

function MultiSelectDropdown({ label, options, selected, onToggle, getColor }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <label style={LABEL_STYLE}>{label}</label>

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          background: "#0f172a",
          border: `1px solid ${open ? "#f59e0b" : "#334155"}`,
          borderRadius: 8,
          padding: "9px 12px",
          color: "#f1f5f9",
          fontSize: 13,
          fontFamily: "inherit",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          textAlign: "left",
          transition: "border-color 0.15s",
          minHeight: 40,
        }}
      >
        <span style={{ flex: 1, overflow: "hidden" }}>
          {selected.length === 0 ? (
            <span style={{ color: "#475569" }}>Select {label.toLowerCase()}…</span>
          ) : (
            <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {options.filter(o => selected.includes(o.id)).map(o => {
                const col = getColor ? getColor(o) : "#f59e0b";
                return (
                  <span key={o.id} style={{
                    background: col + "22",
                    color: col,
                    border: `1px solid ${col}44`,
                    borderRadius: 5,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}>
                    {o.icon && <span>{o.icon}</span>}
                    {o.label}
                    {o.free && (
                      <span style={{ background: "#059669", color: "#fff", borderRadius: 3, padding: "0 3px", fontSize: 8, fontWeight: 700 }}>FREE</span>
                    )}
                  </span>
                );
              })}
            </span>
          )}
        </span>
        <span style={{ color: "#64748b", fontSize: 10, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 100,
          overflow: "hidden",
          animation: "fadeUp 0.15s ease",
        }}>
          {options.map((o, i) => {
            const isSelected = selected.includes(o.id);
            const col = getColor ? getColor(o) : "#f59e0b";
            return (
              <button
                key={o.id}
                onClick={() => onToggle(o.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: isSelected ? col + "15" : "transparent",
                  border: "none",
                  borderTop: i > 0 ? "1px solid #0f172a" : "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                {/* Checkbox */}
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${isSelected ? col : "#475569"}`,
                  background: isSelected ? col : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "#fff",
                }}>
                  {isSelected && "✓"}
                </span>

                {o.icon && <span style={{ fontSize: 15 }}>{o.icon}</span>}

                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 6 }}>
                    {o.label}
                    {o.free !== undefined && (
                      <span style={{ background: "#059669", color: "#fff", borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>
                        FREE
                      </span>
                    )}
                  </span>
                  {o.sublabel && (
                    <span style={{ fontSize: 10, color: "#64748b", display: "block", marginTop: 1 }}>
                      {o.sublabel} {o.tag ? `· ${o.tag}` : ""}
                    </span>
                  )}
                </span>

                {isSelected && (
                  <span style={{ fontSize: 11, color: col, fontWeight: 700 }}>Selected</span>
                )}
              </button>
            );
          })}

          <div style={{ padding: "8px 14px", borderTop: "1px solid #0f172a", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setOpen(false)} style={{ background: "#334155", border: "none", borderRadius: 6, padding: "4px 12px", color: "#94a3b8", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── API Keys Panel ───────────────────────────────────────────────────────────

const PROVIDERS = [
  { keyId: "google", label: "Google AI Studio (Gemini 2.0 Flash)", free: true, link: "https://aistudio.google.com/app/apikey", hint: "AIza…" },
  { keyId: "groq",   label: "Groq (Llama 3 70B + Gemma 2 9B)",    free: true, link: "https://console.groq.com/keys",          hint: "gsk_…" },
];

function ApiKeysPanel({ keys, onSave }) {
  const [draft, setDraft] = useState(keys);
  const [show,  setShow]  = useState({});
  const [saved, setSaved] = useState(false);
  const [open,  setOpen]  = useState(false);

  const handleSave = () => {
    onSave(draft);
    saveKeys(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const anyMissing = PROVIDERS.some(p => !draft[p.keyId]);

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          background: open ? "rgba(5,150,105,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(5,150,105,0.35)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: open ? "12px 12px 0 0" : 12,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.2s",
        }}
      >
        <span style={{ fontSize: 15 }}>🔑</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>API Keys</span>
        <span style={{ background: "#059669", color: "#fff", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
          Both Free
        </span>
        {anyMissing && (
          <span style={{ background: "#f59e0b", color: "#0f172a", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
            Setup required
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ display: "flex", gap: 5 }}>
          {PROVIDERS.map(p => (
            <span key={p.keyId} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: draft[p.keyId] ? "#059669" : "#475569",
              display: "inline-block",
            }} />
          ))}
        </span>
        <span style={{ color: "#64748b", fontSize: 11, marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(5,150,105,0.2)",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          padding: "16px 18px",
        }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 14 }}>
            Both APIs are free tier — no credit card required. Keys are saved to your browser only.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {PROVIDERS.map(p => (
              <div key={p.keyId}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{p.label}</span>
                  <span style={{ background: "#059669", color: "#fff", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>FREE</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type={show[p.keyId] ? "text" : "password"}
                    value={draft[p.keyId] || ""}
                    onChange={e => setDraft(prev => ({ ...prev, [p.keyId]: e.target.value }))}
                    placeholder={p.hint}
                    style={{
                      flex: 1,
                      background: "#0f172a",
                      border: `1px solid ${draft[p.keyId] ? "#059669" : "#334155"}`,
                      borderRadius: 7, padding: "7px 10px",
                      color: "#f1f5f9", fontSize: 12,
                      fontFamily: "inherit", minWidth: 0,
                    }}
                  />
                  <button
                    onClick={() => setShow(prev => ({ ...prev, [p.keyId]: !prev[p.keyId] }))}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "7px 10px", color: "#94a3b8", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    {show[p.keyId] ? "Hide" : "Show"}
                  </button>
                </div>
                <a href={p.link} target="_blank" rel="noreferrer"
                  style={{ fontSize: 10, color: "#059669", textDecoration: "none", marginTop: 3, display: "block" }}>
                  Get free key →
                </a>
              </div>
            ))}
          </div>

          <button onClick={handleSave} style={{
            background: saved ? "#059669" : "#0891b2",
            border: "none", borderRadius: 8, padding: "8px 20px",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s",
          }}>
            {saved ? "✓ Keys Saved" : "Save Keys"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Infographic Card ─────────────────────────────────────────────────────────

function InfographicCard({ content, modelId }) {
  const m = MODELS.find(x => x.id === modelId);
  let data = null;

  try {
    const start = content.indexOf("{");
    const end   = content.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no JSON braces found");
    data = JSON.parse(content.slice(start, end + 1));
  } catch (e) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "#dc2626", background: "#fff5f5", borderRadius: 8, lineHeight: 1.6 }}>
        <strong>Could not parse infographic JSON</strong> ({e.message})
        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 11, color: "#6b7280", wordBreak: "break-all" }}>
          {content.slice(0, 500)}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${m.color}30` }}>
      <div style={{ background: m.color, color: "#fff", padding: "14px 18px", textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{data.title}</div>
        {data.subtitle && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>{data.subtitle}</div>}
      </div>
      {data.stats?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(data.stats.length, 3)}, 1fr)`, gap: 1, background: `${m.color}25` }}>
          {data.stats.map((s, i) => (
            <div key={i} style={{ background: "#fff", padding: "11px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: m.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "13px 15px", background: "#fff" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Key Insights</div>
        {data.points?.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 7 }}>
            <span style={{ background: m.color, color: "#fff", borderRadius: "50%", minWidth: 19, height: 19, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{p}</span>
          </div>
        ))}
      </div>
      {data.cta && (
        <div style={{ background: `${m.color}12`, borderTop: `1px solid ${m.color}20`, padding: "9px 15px", fontSize: 12, fontWeight: 600, color: m.color, textAlign: "center" }}>➜ {data.cta}</div>
      )}
      {data.footer && (
        <div style={{ background: "#f9fafb", padding: "7px 15px", fontSize: 11, color: "#9ca3af", textAlign: "center", borderTop: "1px solid #f0f0f0" }}>{data.footer}</div>
      )}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ modelId, platformId, content, loading, error }) {
  const m = MODELS.find(x => x.id === modelId);
  const p = PLATFORMS.find(x => x.id === platformId);
  const [copied, setCopied] = useState(false);

  return (
    <div style={{ background: "#fff", borderRadius: 13, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
        <span style={{ background: m.bg, color: m.color, borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>{m.icon} {m.label}</span>
        <span style={{ background: "#059669", color: "#fff", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>FREE</span>
        <span style={{ background: p.color + "18", color: p.color, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{p.icon} {p.label}</span>
        <span style={{ flex: 1 }} />
        {content && !loading && (
          <button
            onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
            style={{ background: copied ? "#dcfce7" : "#f3f4f6", border: "none", borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 600, color: copied ? "#16a34a" : "#6b7280", cursor: "pointer" }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        )}
      </div>
      <div style={{ padding: 13, flex: 1 }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: 26, display: "inline-block", color: m.color, animation: "spin 1s linear infinite" }}>⟳</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>Generating with {m.label}…</div>
          </div>
        )}
        {!loading && error && (
          <div style={{ color: "#dc2626", fontSize: 12, padding: "8px 10px", background: "#fff5f5", borderRadius: 7, lineHeight: 1.6 }}>⚠ {error}</div>
        )}
        {!loading && !error && content && (
          platformId === "infographic"
            ? <InfographicCard content={content} modelId={modelId} />
            : <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, lineHeight: 1.75, color: "#1f2937", margin: 0 }}>{content}</pre>
        )}
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const LABEL_STYLE = {
  fontSize: 11, color: "#94a3b8", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 0.8,
  display: "block", marginBottom: 5,
};

const INPUT_STYLE = {
  width: "100%", background: "#0f172a", border: "1px solid #334155",
  borderRadius: 8, padding: "8px 11px", color: "#f1f5f9",
  fontSize: 13, fontFamily: "inherit",
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [keys,              setKeys]             = useState(loadKeys);
  const [topic,             setTopic]            = useState("");
  const [tone,              setTone]             = useState("Professional");
  const [industry,          setIndustry]         = useState("Technology");
  const [keywords,          setKeywords]         = useState("");
  const [selectedModels,    setSelectedModels]   = useState(["gemini"]);
  const [selectedPlatforms, setSelectedPlatforms]= useState(["linkedin"]);
  const [results,           setResults]          = useState({});
  const [loading,           setLoading]          = useState({});
  const [errors,            setErrors]           = useState({});
  const [hasGenerated,      setHasGenerated]     = useState(false);

  const toggleModel    = id => setSelectedModels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const togglePlatform = id => setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const canGenerate = topic.trim() && selectedModels.length > 0 && selectedPlatforms.length > 0;
  const totalCells  = selectedModels.length * selectedPlatforms.length;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    const initL = {}, initR = {}, initE = {};
    for (const mod of selectedModels)
      for (const plt of selectedPlatforms) {
        const k = `${mod}-${plt}`;
        initL[k] = true; initR[k] = null; initE[k] = null;
      }
    setLoading(initL); setResults(initR); setErrors(initE);
    setHasGenerated(true);

    await Promise.all(
      selectedModels.flatMap(mod =>
        selectedPlatforms.map(async plt => {
          const k = `${mod}-${plt}`;
          try {
            const text = await callAPI(mod, buildPrompt(topic, plt, tone, industry, keywords, mod), keys);
            setResults(prev => ({ ...prev, [k]: text }));
          } catch (e) {
            setErrors(prev => ({ ...prev, [k]: e.message || String(e) }));
          } finally {
            setLoading(prev => ({ ...prev, [k]: false }));
          }
        })
      )
    );
  }, [topic, tone, industry, keywords, selectedModels, selectedPlatforms, keys, canGenerate]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f1f5f9" }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        * { box-sizing: border-box; }
        textarea, input, select { font-family: inherit; }
        textarea:focus, input:focus, select:focus { outline: 2px solid #059669; outline-offset: -1px; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "16px 26px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 13, background: "rgba(0,0,0,0.25)" }}>
        <div style={{ background: "linear-gradient(135deg, #059669, #0891b2)", borderRadius: 9, padding: "6px 12px", fontSize: 17, fontWeight: 900, letterSpacing: -1 }}>✦ FORGE</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Multi-Model Content Studio</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Gemini 2.0 Flash · Llama 3 · Gemma 2 &nbsp;|&nbsp; LinkedIn · Instagram · Infographic
            &nbsp;·&nbsp;
            <span style={{ color: "#059669", fontWeight: 600 }}>100% Free APIs</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 18px" }}>

        {/* API Keys */}
        <ApiKeysPanel keys={keys} onSave={setKeys} />

        {/* Config Panel */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 15, padding: 20, marginBottom: 20 }}>

          {/* Topic */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL_STYLE}>Topic *</label>
            <textarea
              value={topic} onChange={e => setTopic(e.target.value)} rows={2}
              placeholder="e.g. How agentic AI is transforming predictive maintenance in OT environments…"
              style={{ ...INPUT_STYLE, lineHeight: 1.6, resize: "vertical" }}
            />
          </div>

          {/* Model + Platform dropdowns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <MultiSelectDropdown
              label="AI Models"
              options={MODELS}
              selected={selectedModels}
              onToggle={toggleModel}
              getColor={o => o.color}
            />
            <MultiSelectDropdown
              label="Platforms"
              options={PLATFORMS}
              selected={selectedPlatforms}
              onToggle={togglePlatform}
              getColor={o => o.color}
            />
          </div>

          {/* Tone + Industry + Keywords */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>Tone</label>
              <select value={tone} onChange={e => setTone(e.target.value)} style={INPUT_STYLE}>
                {TONES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} style={INPUT_STYLE}>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Keywords (optional)</label>
              <input value={keywords} onChange={e => setKeywords(e.target.value)}
                placeholder="e.g. SCADA, digital twin, Industry 4.0" style={INPUT_STYLE} />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <button onClick={handleGenerate} disabled={!canGenerate} style={{
            background: canGenerate ? "linear-gradient(135deg, #059669, #0891b2)" : "#1e293b",
            border: "none", borderRadius: 10, padding: "13px 44px",
            color: canGenerate ? "#fff" : "#475569",
            fontSize: 15, fontWeight: 800,
            cursor: canGenerate ? "pointer" : "not-allowed",
            boxShadow: canGenerate ? "0 6px 24px rgba(5,150,105,0.3)" : "none",
            transition: "all 0.2s", fontFamily: "inherit",
          }}>
            ✦ Generate {totalCells > 0 ? `${totalCells} Post${totalCells > 1 ? "s" : ""}` : "Content"}
          </button>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
            {!topic.trim() && <span style={{ color: "#f59e0b" }}>Enter a topic · </span>}
            {selectedModels.length} model{selectedModels.length !== 1 ? "s" : ""} × {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Results */}
        {hasGenerated && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {selectedPlatforms.map(plt => {
              const p = PLATFORMS.find(x => x.id === plt);
              return (
                <div key={plt} style={{ marginBottom: 26 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
                    <div style={{ background: p.color, color: "#fff", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                      {p.icon} {p.label}
                    </div>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(selectedModels.length, 3)}, 1fr)`, gap: 13 }}>
                    {selectedModels.map(mod => {
                      const k = `${mod}-${plt}`;
                      return <ResultCard key={k} modelId={mod} platformId={plt} content={results[k]} loading={loading[k]} error={errors[k]} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
