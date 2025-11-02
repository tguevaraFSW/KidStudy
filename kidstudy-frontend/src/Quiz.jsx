import { useEffect, useMemo, useState } from "react";

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Quiz() {
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  // Load current set from session (no saving needed)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kidstudy:current");
      if (raw) setCards(JSON.parse(raw));
    } catch {}
  }, []);

  const current = cards[idx] || null;

  // Build options: correct answer + 3 distractors from other backs
  const options = useMemo(() => {
    if (!current || cards.length === 0) return [];
    const others = cards
      .map((c, i) => ({ ...c, i }))
      .filter((c, i) => i !== idx)
      .map((c) => c.back_text);
    const distractors = shuffle(others).slice(0, Math.min(3, Math.max(0, others.length)));
    return shuffle([current.back_text, ...distractors]);
  }, [cards, idx]);

  const next = () => {
    if (!checked) return; // require check first
    const last = idx === cards.length - 1;
    if (last) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
      setChecked(false);
    }
  };

  if (!cards.length) {
    return (
      <Page>
        <CardWrap>
          <h2 style={{ margin: 0 }}>No flashcards loaded</h2>
          <p style={{ color: "#475569" }}>
            Go back to the generator and create a set first.
          </p>
          <NavBtn href="/" label="← Back to generator" />
        </CardWrap>
      </Page>
    );
  }

  if (done) {
    const percent = Math.round((score / cards.length) * 100);
    return (
      <Page>
        <CardWrap>
          <h2 style={{ marginTop: 0 }}>Quiz Complete 🎉</h2>
          <p style={{ fontSize: 18, margin: "8px 0" }}>
            Score: <b>{score}</b> / {cards.length} ({percent}%)
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={() => window.location.assign("/")}>Back to generator</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIdx(0);
                setScore(0);
                setSelected(null);
                setChecked(false);
                setDone(false);
              }}
            >
              Retry quiz
            </Button>
          </div>
        </CardWrap>
      </Page>
    );
  }

  return (
    <Page>
      <div style={{ maxWidth: 900, width: "100%", margin: "0 auto" }}>
        <Header title="Multiple-Choice Quiz" />
        <Progress now={idx + 1} total={cards.length} />
        <div style={{ marginTop: 16 }}>
          <QuestionCard front={current.front_text} />
        </div>

        {/* Options block: left-aligned column, centered on page */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5eef9",
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
              borderRadius: 14,
              padding: 16,
              width: 680,
            }}
          >
            <div
              role="radiogroup"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                alignItems: "flex-start", // left align
                margin: "6px 8px",
              }}
            >
              {options.map((opt, i) => {
                const isCorrect = opt === current.back_text;
                const showState = checked;
                const bg =
                  showState && isCorrect
                    ? "#ecfdf5"
                    : showState && selected === opt && !isCorrect
                    ? "#fef2f2"
                    : "transparent";
                const border =
                  showState && isCorrect
                    ? "1px solid #86efac"
                    : showState && selected === opt && !isCorrect
                    ? "1px solid #fecaca"
                    : "1px solid #e2e8f0";

                return (
                  <label
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: 10,
                      width: "100%",
                      background: bg,
                      border,
                      cursor: checked ? "default" : "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="mcq"
                      value={opt}
                      checked={selected === opt}
                      onChange={() => !checked && setSelected(opt)}
                      style={{ transform: "scale(1.1)" }}
                      disabled={checked}
                    />
                    <span style={{ color: "#0f172a" }}>{opt}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {!checked ? (
                <Button
                  onClick={() => {
                    if (!selected) return;
                    if (selected === current.back_text) setScore((s) => s + 1);
                    setChecked(true);
                  }}
                >
                  Check answer
                </Button>
              ) : (
                <Button onClick={next}>Next</Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(null);
                  setChecked(false);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

/* ---------- Reusable little pieces (same style as App.jsx) ---------- */
function Page({ children }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #eaf3ff 0%, #f7fbff 40%, #ffffff 100%)",
        padding: "32px 16px",
      }}
    >
      {children}
    </div>
  );
}

function CardWrap({ children }) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 12px 26px rgba(0,0,0,0.08)",
        padding: 20,
        border: "1px solid #e8eef7",
      }}
    >
      {children}
    </div>
  );
}

function Header({ title }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5eef9",
        borderRadius: 14,
        padding: 16,
        boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
      }}
    >
      <h2 style={{ margin: 0, color: "#0f172a" }}>{title}</h2>
      <p style={{ margin: "6px 0 0", color: "#577399" }}>
        Choose the correct answer. Feedback shows after you check.
      </p>
    </div>
  );
}

function QuestionCard({ front }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5eef9",
        borderRadius: 14,
        padding: 18,
        boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontWeight: 700, color: "#2563eb", marginBottom: 6, textTransform: "uppercase", fontSize: 13 }}>
        Question
      </div>
      <div style={{ fontSize: 18, color: "#0f172a", lineHeight: 1.4 }}>{front}</div>
    </div>
  );
}

function Progress({ now, total }) {
  const pct = Math.round((now / total) * 100);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569" }}>
        <div>
          Question {now} / {total}
        </div>
        <div>{pct}%</div>
      </div>
      <div
        style={{
          height: 10,
          background: "#eaf2fd",
          borderRadius: 999,
          overflow: "hidden",
          marginTop: 6,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "linear-gradient(90deg, #60a5fa, #2563eb)",
          }}
        />
      </div>
    </div>
  );
}

function Button({ children, onClick, variant = "primary" }) {
  const base = {
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    fontWeight: 600,
    cursor: "pointer",
  };
  const styles =
    variant === "secondary"
      ? { ...base, background: "#ffffff", color: "#2563eb", border: "1px solid #cfe0f5" }
      : { ...base, background: "#2563eb", color: "white" };
  return (
    <button style={styles} onClick={onClick}>
      {children}
    </button>
  );
}

function NavBtn({ href, label }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        textDecoration: "none",
        background: "#2563eb",
        color: "white",
        padding: "10px 14px",
        borderRadius: 10,
        fontWeight: 600,
        marginTop: 6,
      }}
    >
      {label}
    </a>
  );
}
