import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

/* --------------------------- storage helpers --------------------------- */
const LS_KEY = "kidstudy:last_set";
const SS_KEY = "kidstudy:current";

function writeCurrentSet(cards) {
  try {
    const json = JSON.stringify(cards || []);
    localStorage.setItem(LS_KEY, json);
    sessionStorage.setItem(SS_KEY, json);
  } catch {}
}

function readCurrentSet() {
  try {
    const rawL = localStorage.getItem(LS_KEY);
    if (rawL) return JSON.parse(rawL);
  } catch {}
  try {
    const rawS = sessionStorage.getItem(SS_KEY);
    if (rawS) return JSON.parse(rawS);
  } catch {}
  return [];
}

function normalizeCards(raw) {
  return (raw || [])
    .filter(Boolean)
    .map((c) => ({
      front_text: (c.front_text || "").trim(),
      back_text: (c.back_text || "").trim(),
    }))
    .filter((c) => c.front_text && c.back_text);
}

/* ------------------------------- Shell UI ------------------------------ */
function NavBar({ hasCards }) {
  return (
    <div className="header">
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: ".02em", color: "#0f172a" }}>KidStudy</span>
          <span className="badge">K–12 Flashcards & Quizzes</span>
        </div>
        <div className="controls">
          <Link to="/" className="btn-subtle" style={btnLinkStyle}>Generator</Link>
          <Link to="/quiz" className="btn-subtle" style={{ ...btnLinkStyle, opacity: hasCards ? 1 : .5, pointerEvents: hasCards ? "auto" : "none" }}>
            Multiple-Choice Quiz
          </Link>
          <Link to="/flip" className="btn-subtle" style={{ ...btnLinkStyle, opacity: hasCards ? 1 : .5, pointerEvents: hasCards ? "auto" : "none" }}>
            Flip Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}

const btnLinkStyle = { padding: ".55rem .85rem", borderRadius: 8, textDecoration: "none", display: "inline-block" };

/* ---------------------------- Generator Page --------------------------- */
function GeneratorPage() {
  const [topic, setTopic] = useState("");
  const [gradeBand, setGradeBand] = useState("3-5");
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState(() => normalizeCards(readCurrentSet()));

  useEffect(() => {
    writeCurrentSet(cards);
  }, []);

  const dec = () => setCount((n) => Math.max(1, Math.min(24, Number(n) - 1)));
  const inc = () => setCount((n) => Math.max(1, Math.min(24, Number(n) + 1)));
  const onNumberChange = (e) => {
    const v = parseInt(e.target.value.replace(/\D/g, "") || "0", 10);
    setCount(Math.max(1, Math.min(24, v)));
  };

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const body = {
        topic: topic.trim(),
        grade_band: gradeBand,
        count: Number(count) || 8
      };
      const res = await axios.post(`${import.meta.env.VITE_API_BASE}/api/prompt`, body);
      const generated = normalizeCards(res.data);
      setCards(generated);
      writeCurrentSet(generated); // quizzes can start immediately
    } catch (e) {
      console.error("Error generating:", e?.response?.data || e.message);
      alert("Could not reach the generator. Check that the backend is running and API base URL is correct.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 18 }}>
      <section
        style={{
          background: "var(--panel)",
          border: "1px solid var(--panel-border)",
          borderRadius: 14,
          boxShadow: "var(--shadow)",
          padding: "1rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Create Flashcards</h2>
        <p style={{ marginTop: 6, color: "var(--muted)" }}>
          Enter a topic (e.g., “3rd grade science: life cycles”). Choose a grade band and how many cards to generate.
        </p>
        <div className="controls" style={{ marginTop: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Topic (e.g., 3rd grade science - life cycles)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ minWidth: 320 }}
          />
          <select value={gradeBand} onChange={(e) => setGradeBand(e.target.value)}>
            <option value="K-2">K–2</option>
            <option value="3-5">3–5</option>
            <option value="6-8">6–8</option>
            <option value="9-12">9–12</option>
          </select>

          {/* Count stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid var(--panel-border)", borderRadius: 10, padding: "4px 6px" }}>
            <button className="btn-subtle" onClick={dec} type="button" style={{ padding: ".4rem .6rem" }}>−</button>
            <input
              type="text"
              inputMode="numeric"
              value={count}
              onChange={onNumberChange}
              style={{ width: 50, textAlign: "center", border: "none" }}
            />
            <button className="btn-subtle" onClick={inc} type="button" style={{ padding: ".4rem .6rem" }}>+</button>
          </div>

          <button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </section>

      {/* Flashcard grid */}
      {cards.length > 0 && (
        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 8px 0" }}>Flashcards</h3>
          <div className="card-grid">
            {cards.map((c, idx) => (
              <FlipCard key={idx} front={c.front_text} back={c.back_text} />
            ))}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/quiz" className="btn-subtle" style={btnLinkStyle}>Start Multiple-Choice Quiz</Link>
            <Link to="/flip" className="btn-subtle" style={btnLinkStyle}>Start Flip Quiz</Link>
          </div>
        </section>
      )}

      {cards.length === 0 && (
        <p style={{ marginTop: 12, color: "var(--muted)" }}>No cards yet. Generate a set above.</p>
      )}
    </div>
  );
}

function FlipCard({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={`flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)} role="button" aria-label="Flip card">
      <div className="flashcard-inner">
        <div className="face front">
          <h4>Question</h4>
          <p style={clampStyle(6)}>{front}</p>
          <small style={{ color: "#64748b", marginTop: 8 }}>Click to reveal</small>
        </div>
        <div className="face back">
          <h4>Answer</h4>
          <p style={clampStyle(6)}>{back}</p>
          <small style={{ color: "#64748b", marginTop: 8 }}>Click to hide</small>
        </div>
      </div>
    </div>
  );
}

function clampStyle(lines = 6) {
  return {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.45,
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "center",
    padding: "0 .25rem",
  };
}

/* ------------------------ Multiple-choice Quiz ------------------------- */
function QuizPage() {
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setCards(normalizeCards(readCurrentSet()));
  }, []);

  const current = cards[idx] || null;

  const options = useMemo(() => {
    if (!current || cards.length === 0) return [];
    const others = cards
      .map((c, i) => ({ ...c, i }))
      .filter((_, i) => i !== idx)
      .map((c) => c.back_text);
    const distractors = shuffle(others).slice(0, Math.min(3, Math.max(0, others.length)));
    return shuffle([current.back_text, ...distractors]);
  }, [cards, idx]);

  function check() {
    if (!selected) return;
    if (selected === current.back_text) setScore((s) => s + 1);
    setChecked(true);
  }

  function next() {
    if (!checked) return;
    const last = idx === cards.length - 1;
    if (last) setDone(true);
    else {
      setIdx((i) => i + 1);
      setSelected(null);
      setChecked(false);
    }
  }

  if (!cards.length) {
    return <EmptyState />;
  }

  if (done) {
    const pct = Math.round((score / cards.length) * 100);
    return (
      <div className="container" style={{ paddingTop: 18 }}>
        <h2>Quiz Complete 🎉</h2>
        <p style={{ fontSize: 18 }}>Score: <b>{score}</b> / {cards.length} ({pct}%)</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/" className="btn-subtle" style={btnLinkStyle}>Back to Generator</Link>
          <button onClick={() => { setIdx(0); setScore(0); setSelected(null); setChecked(false); setDone(false); }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 18 }}>
      <h2 style={{ marginTop: 0 }}>Multiple-Choice Quiz</h2>
      <Progress now={idx + 1} total={cards.length} />
      <div
        style={{
          marginTop: 14,
          background: "var(--panel)",
          border: "1px solid var(--panel-border)",
          borderRadius: 14,
          padding: 16,
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ fontWeight: 700, color: "#2563eb", marginBottom: 6, textTransform: "uppercase", fontSize: 13 }}>
          Question
        </div>
        <div style={{ fontSize: 18, color: "var(--text)", lineHeight: 1.4 }}>{current.front_text}</div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 680, border: "1px solid var(--panel-border)", borderRadius: 12, padding: 12, background: "#fff", boxShadow: "var(--shadow)" }}>
            <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", margin: "6px 8px" }}>
              {options.map((opt, i) => {
                const isCorrect = opt === current.back_text;
                const showState = checked;
                const bg =
                  showState && isCorrect ? "#ecfdf5" :
                  showState && selected === opt && !isCorrect ? "#fef2f2" : "transparent";
                const border =
                  showState && isCorrect ? "1px solid #86efac" :
                  showState && selected === opt && !isCorrect ? "1px solid #fecaca" : "1px solid #e2e8f0";

                return (
                  <label key={i} style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 10,
                    width: "100%",
                    background: bg,
                    border,
                    cursor: checked ? "default" : "pointer",
                  }}>
                    <input
                      type="radio"
                      name="mcq"
                      value={opt}
                      checked={selected === opt}
                      onChange={() => !checked && setSelected(opt)}
                      style={{ transform: "scale(1.1)" }}
                      disabled={checked}
                    />
                    <span style={{ color: "var(--text)" }}>{opt}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {!checked ? (
                <button onClick={check} disabled={!selected}>Check answer</button>
              ) : (
                <button onClick={next}>Next</button>
              )}
              <button
                className="btn-subtle"
                onClick={() => { setSelected(null); setChecked(false); }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Link to="/" className="btn-subtle" style={btnLinkStyle}>← Back to Generator</Link>
      </div>
    </div>
  );
}

/* --------------------------- Flip Quiz (click) ------------------------- */
function FlipQuizPage() {
  const [cards, setCards] = useState([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    setCards(normalizeCards(readCurrentSet()));
  }, []);

  const current = useMemo(() => cards[i] || null, [cards, i]);
  const done = i >= cards.length;

  function onCardClick() {
    if (!current) return;
    setRevealed((r) => !r);
  }

  function mark(ok) {
    if (ok) setCorrect((c) => c + 1);
    setI((x) => x + 1);
    setRevealed(false);
  }

  function restart() {
    setI(0);
    setCorrect(0);
    setRevealed(false);
  }

  if (!cards.length) return <EmptyState />;

  if (done) {
    const pct = Math.round((correct / cards.length) * 100);
    return (
      <div className="container" style={{ paddingTop: 18 }}>
        <h2>Flip Quiz Complete ✅</h2>
        <p style={{ fontSize: 18 }}>
          You got <b>{correct}</b> / {cards.length} ({pct}%)
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={restart}>Restart</button>
          <Link to="/" className="btn-subtle" style={btnLinkStyle}>Back to Generator</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 18 }}>
      <div className="quiz-meta">
        <div className="badge">Flip Quiz</div>
        <div>Card {i + 1} / {cards.length}</div>
        <div>Score: {correct}/{cards.length} ({cards.length ? Math.round((correct/cards.length)*100) : 0}%)</div>
      </div>

      <div className="quiz-card" onClick={onCardClick}>
        {!revealed ? (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8, color: "#2563eb" }}>Question</h3>
            <div style={{ fontSize: 18, lineHeight: 1.5, textAlign: "center" }}>{current.front_text}</div>
            <div style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>Click the card to reveal the answer</div>
          </div>
        ) : (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8, color: "#10b981" }}>Answer</h3>
            <div style={{ fontSize: 18, lineHeight: 1.6, textAlign: "center" }}>{current.back_text}</div>
            <div style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>Click the card to hide again</div>
          </div>
        )}
      </div>

      {revealed && (
        <div className="quiz-actions">
          <button className="btn-success" onClick={() => mark(true)}>Correct</button>
          <button className="btn-danger" onClick={() => mark(false)}>Try Again</button>
        </div>
      )}

      <div style={{ marginTop: 12, textAlign: "center" }}>
        <Link to="/" className="btn-subtle" style={btnLinkStyle}>← Back to Generator</Link>
      </div>
    </div>
  );
}

/* ------------------------------ Shared UI ------------------------------ */
function EmptyState() {
  return (
    <div className="container" style={{ paddingTop: 18, textAlign: "center", color: "var(--muted)" }}>
      No flashcards found. Go to the <Link to="/" className="btn-subtle" style={{ ...btnLinkStyle, marginLeft: 6 }}>Generator</Link> and create a set.
    </div>
  );
}

function Progress({ now, total }) {
  const pct = Math.round((now / total) * 100);
  return (
    <div style={{ margin: "8px 0 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569" }}>
        <div>
          Question {now} / {total}
        </div>
        <div>{pct}%</div>
      </div>
      <div style={{ height: 10, background: "#eaf2fd", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #60a5fa, #2563eb)" }} />
      </div>
    </div>
  );
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

/* --------------------------------- App --------------------------------- */
export default function App() {
  const [hasCards, setHasCards] = useState(false);

  useEffect(() => {
    const current = normalizeCards(readCurrentSet());
    setHasCards(current.length > 0);
    const onStorage = () => {
      const updated = normalizeCards(readCurrentSet());
      setHasCards(updated.length > 0);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <BrowserRouter>
      <NavBar hasCards={hasCards} />
      <Routes>
        <Route path="/" element={<GeneratorPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/flip" element={<FlipQuizPage />} />
        <Route path="*" element={<GeneratorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
