import { useState, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-5";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
  { id: "claude", label: "Claude", tag: "Anthropic", color: "#d97706", bg: "#fef3c7", icon: "◈" },
  { id: "grok",   label: "Grok",   tag: "xAI",       color: "#7c3aed", bg: "#ede9fe", icon: "◎" },
  { id: "gemma",  label: "Gemma",  tag: "Google",     color: "#0891b2", bg: "#cffafe", icon: "◇" },
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

function buildPrompt(topic, platform, tone, industry, keywords, model) {
  const kw = keywords ? `Keywords to include: ${keywords}.` : "";
  const persona =
    model === "grok"
      ? "Adopt the Grok AI persona — bold, direct, slightly edgy."
      : model === "gemma"
      ? "Adopt the Gemma AI persona — precise, informative, Google-style."
      : "";

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

// ─── API Call (direct — user supplies key via UI) ─────────────────────────────

async function callAPI(prompt, apiKey) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1000,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
  } catch (networkErr) {
    throw new Error("Network error: " + networkErr.message);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned non-JSON (HTTP " + res.status + ")");
  }

  if (!res.ok) {
    throw new Error(data?.error?.message || "API error " + res.status);
  }

  if (!Array.isArray(data?.content)) {
    throw new Error("Unexpected response: " + JSON.stringify(data).slice(0, 120));
  }

  const text = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) throw new Error("Model returned empty content");
  return text;
}

// ─── Infographic Card ─────────────────────────────────────────────────────────

function InfographicCard({ content, modelId }) {
  const m = MODELS.find((x) => x.id === modelId);
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
        {data.subtitle && (
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>{data.subtitle}</div>
        )}
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
        <div style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Key Insights
        </div>
        {data.points?.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 7 }}>
            <span style={{ background: m.color, color: "#fff", borderRadius: "50%", minWidth: 19, height: 19, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{p}</span>
          </div>
        ))}
      </div>

      {data.cta && (
        <div style={{ background: `${m.color}12`, borderTop: `1px solid ${m.color}20`, padding: "9px 15px", fontSize: 12, fontWeight: 600, color: m.color, textAlign: "center" }}>
          ➜ {data.cta}
        </div>
      )}
      {data.footer && (
        <div style={{ background: "#f9fafb", padding: "7px 15px", fontSize: 11, color: "#9ca3af", textAlign: "center", borderTop: "1px solid #f0f0f0" }}>
          {data.footer}
        </div>
      )}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ modelId, platformId, content, loading, error }) {
  const m = MODELS.find((x) => x.id === modelId);
  const p = PLATFORMS.find((x) => x.id === platformId);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ background: "#fff", borderRadius: 13, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
        <span style={{ background: m.bg, color: m.color, borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
          {m.icon} {m.label}
        </span>
        <span style={{ background: p.color + "18", color: p.color, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>
          {p.icon} {p.label}
        </span>
        <span style={{ flex: 1 }} />
        {content && !loading && (
          <button onClick={handleCopy} style={{ background: copied ? "#dcfce7" : "#f3f4f6", border: "none", borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 600, color: copied ? "#16a34a" : "#6b7280", cursor: "pointer" }}>
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
          <div style={{ color: "#dc2626", fontSize: 12, padding: "8px 10px", background: "#fff5f5", borderRadius: 7, lineHeight: 1.6 }}>
            ⚠ {error}
          </div>
        )}
        {!loading && !error && content && (
          platformId === "infographic" ? (
            <InfographicCard content={content} modelId={modelId} />
          ) : (
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, lineHeight: 1.75, color: "#1f2937", margin: 0 }}>
              {content}
            </pre>
          )
        )}
      </div>
    </div>
  );
}

// ─── Chip Toggle ──────────────────────────────────────────────────────────────

function Chip({ active, color, bg, onClick, children }) {
  return (
    <button onClick={onClick} style={{ background: active ? bg : "rgba(255,255,255,0.04)", border: `2px solid ${active ? color : "rgba(255,255,255,0.1)"}`, borderRadius: 9, padding: "7px 15px", cursor: "pointer", color: active ? color : "#94a3b8", fontWeight: 700, fontSize: 13, transition: "all 0.15s", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}

// ─── API Key Banner ───────────────────────────────────────────────────────────

function ApiKeyBanner({ apiKey, setApiKey, saved, setSaved }) {
  const [input, setInput] = useState(apiKey);
  const [show,  setShow]  = useState(false);

  const save = () => {
    setApiKey(input.trim());
    localStorage.setItem("anthropic_key", input.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700, whiteSpace: "nowrap" }}>🔑 Anthropic API Key</div>
      <div style={{ flex: 1, display: "flex", gap: 8, minWidth: 260 }}>
        <input
          type={show ? "text" : "password"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="sk-ant-api03-…"
          style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 7, padding: "7px 11px", color: "#f1f5f9", fontSize: 13, fontFamily: "inherit" }}
        />
        <button onClick={() => setShow(!show)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "7px 11px", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          {show ? "Hide" : "Show"}
        </button>
        <button onClick={save} style={{ background: saved ? "#059669" : "#f59e0b", border: "none", borderRadius: 7, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {saved ? "✓ Saved" : "Save"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#64748b", width: "100%" }}>
        Your key is stored in browser localStorage only — never sent anywhere except directly to Anthropic. Get yours at{" "}
        <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: "#f59e0b" }}>console.anthropic.com</a>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [apiKey,            setApiKey]            = useState(() => localStorage.getItem("anthropic_key") || "");
  const [keySaved,          setKeySaved]          = useState(false);
  const [topic,             setTopic]             = useState("");
  const [tone,              setTone]              = useState("Professional");
  const [industry,          setIndustry]          = useState("Technology");
  const [keywords,          setKeywords]          = useState("");
  const [selectedModels,    setSelectedModels]    = useState(["claude"]);
  const [selectedPlatforms, setSelectedPlatforms] = useState(["linkedin"]);
  const [results,           setResults]           = useState({});
  const [loading,           setLoading]           = useState({});
  const [errors,            setErrors]            = useState({});
  const [hasGenerated,      setHasGenerated]      = useState(false);

  const toggleItem = (list, setList, id) =>
    setList((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const canGenerate = apiKey && topic.trim() && selectedModels.length > 0 && selectedPlatforms.length > 0;
  const totalCells  = selectedModels.length * selectedPlatforms.length;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    const initL = {}, initR = {}, initE = {};
    for (const mod of selectedModels) {
      for (const plt of selectedPlatforms) {
        const k = `${mod}-${plt}`;
        initL[k] = true; initR[k] = null; initE[k] = null;
      }
    }
    setLoading(initL); setResults(initR); setErrors(initE);
    setHasGenerated(true);

    await Promise.all(
      selectedModels.flatMap((mod) =>
        selectedPlatforms.map(async (plt) => {
          const k = `${mod}-${plt}`;
          try {
            const text = await callAPI(
              buildPrompt(topic, plt, tone, industry, keywords, mod),
              apiKey
            );
            setResults((prev) => ({ ...prev, [k]: text }));
          } catch (e) {
            setErrors((prev) => ({ ...prev, [k]: e.message || String(e) }));
          } finally {
            setLoading((prev) => ({ ...prev, [k]: false }));
          }
        })
      )
    );
  }, [topic, tone, industry, keywords, selectedModels, selectedPlatforms, apiKey, canGenerate]);

  const inputStyle = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "8px 11px", color: "#f1f5f9", fontSize: 13, fontFamily: "inherit" };
  const labelStyle = { fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f1f5f9" }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        * { box-sizing: border-box; }
        textarea, input, select { font-family: inherit; }
        textarea:focus, input:focus, select:focus { outline: 2px solid #f59e0b; outline-offset: -1px; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "16px 26px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 13, background: "rgba(0,0,0,0.25)" }}>
        <div style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", borderRadius: 9, padding: "6px 12px", fontSize: 17, fontWeight: 900, letterSpacing: -1 }}>✦ FORGE</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Multi-Model Content Studio</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Claude · Grok · Gemma &nbsp;|&nbsp; LinkedIn · Instagram · Infographic</div>
        </div>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 18px" }}>

        {/* API Key Banner */}
        <ApiKeyBanner apiKey={apiKey} setApiKey={setApiKey} saved={keySaved} setSaved={setKeySaved} />

        {/* Config Panel */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 15, padding: 20, marginBottom: 20 }}>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Topic *</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
              placeholder="e.g. How agentic AI is transforming predictive maintenance in OT environments…"
              style={{ ...inputStyle, lineHeight: 1.6, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "150px 200px 1fr", gap: 12, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} style={inputStyle}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={inputStyle}>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Keywords (optional)</label>
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. SCADA, digital twin, Industry 4.0"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <label style={labelStyle}>AI Models</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MODELS.map((m) => (
                  <Chip key={m.id} active={selectedModels.includes(m.id)} color={m.color} bg={m.bg}
                    onClick={() => toggleItem(selectedModels, setSelectedModels, m.id)}>
                    {m.icon} {m.label}
                    <span style={{ fontSize: 9, display: "block", opacity: 0.6 }}>{m.tag}</span>
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Platforms</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PLATFORMS.map((p) => (
                  <Chip key={p.id} active={selectedPlatforms.includes(p.id)} color={p.color} bg={p.color + "22"}
                    onClick={() => toggleItem(selectedPlatforms, setSelectedPlatforms, p.id)}>
                    {p.icon} {p.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <button onClick={handleGenerate} disabled={!canGenerate} style={{ background: canGenerate ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "#1e293b", border: "none", borderRadius: 10, padding: "13px 42px", color: canGenerate ? "#fff" : "#475569", fontSize: 15, fontWeight: 800, cursor: canGenerate ? "pointer" : "not-allowed", boxShadow: canGenerate ? "0 6px 24px rgba(245,158,11,0.28)" : "none", transition: "all 0.2s", fontFamily: "inherit" }}>
            ✦ Generate {totalCells > 0 ? `${totalCells} Post${totalCells > 1 ? "s" : ""}` : "Content"}
          </button>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
            {!apiKey && <span style={{ color: "#f59e0b" }}>⚠ Enter your API key above first · </span>}
            {selectedModels.length} model{selectedModels.length !== 1 ? "s" : ""} × {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? "s" : ""} · Grok &amp; Gemma are persona-simulated via Claude
          </div>
        </div>

        {/* Results */}
        {hasGenerated && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {selectedPlatforms.map((plt) => {
              const p = PLATFORMS.find((x) => x.id === plt);
              return (
                <div key={plt} style={{ marginBottom: 26 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
                    <div style={{ background: p.color, color: "#fff", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                      {p.icon} {p.label}
                    </div>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(selectedModels.length, 3)}, 1fr)`, gap: 13 }}>
                    {selectedModels.map((mod) => {
                      const k = `${mod}-${plt}`;
                      return (
                        <ResultCard key={k} modelId={mod} platformId={plt}
                          content={results[k]} loading={loading[k]} error={errors[k]} />
                      );
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
