import { useEffect, useState } from "react";

export default function FlipQuiz() {
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [shownBack, setShownBack] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kidstudy:current");
      if (raw) setCards(JSON.parse(raw));
    } catch {}
  }, []);

  const current = cards[idx] || null;

  const reveal = () => setShownBack(true);

  const next = (wasCorrect) => {
    if (wasCorrect) setScore((s) => s + 1);
    const last = idx === cards.length - 1;
    if (last) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setShownBack(false);
    }
  };

  if (!cards.length) {
    return (
      <Page>
        <CardWrap>
          <h2 style={{ marginTop: 0 }}>No flashcards loaded</h2>
          <p style={{ color: "#475569" }}>Generate cards first, then start the Flip Quiz.</p>
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
          <h2 style={{ marginTop: 0 }}>Flip Quiz Complete ✅</h2>
          <p style={{ fontSize: 18 }}>
            You marked <b>{score}</b> correct out of {cards.length} ({percent}%)
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={() => window.location.assign("/")}>Back to generator</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIdx(0);
                setScore(0);
                setShownBack(false);
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
        <Header title="Flip Quiz (Self-Check)" />
        <Progress now={idx + 1} total={cards.length} />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16, justifyContent: "center" }}>
          <FixedCard label="Question" color="#2563eb" text={current.front_text} />
          <FixedCard
            label="Answer"
            color="#16a34a"
            text={shownBack ? current.back_text : "Tap Reveal to see the answer"}
            masked={!shownBack}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
          {!shownBack ? (
            <Button onClick={reveal}>Reveal answer</Button>
          ) : (
            <>
              <Button onClick={() => next(true)}>I was correct</Button>
              <Button variant="secondary" onClick={() => next(false)}>
                I was wrong
              </Button>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}

/* ---------- Tiny shared UI (matches App.jsx tone) ---------- */
function FixedCard({ label, color, text, masked = false }) {
  const w = 380;
  const h = 220;
  return (
    <div
      style={{
        width: w,
        height: h,
        background: "#ffffff",
        border: "1px solid #e5eef9",
        borderRadius: 14,
        boxShadow: "0 10px 18px rgba(0,0,0,0.08)",
        padding: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 0.3,
          color,
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          color: "#0f172a",
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 6,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          opacity: masked ? 0.4 : 1,
          textAlign: "center",
          padding: "0 6px",
        }}
      >
        {text}
      </div>
    </div>
  );
}

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
        Reveal the answer, then honestly mark yourself.
      </p>
    </div>
  );
}

function Progress({ now, total }) {
  const pct = Math.round((now / total) * 100);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569" }}>
        <div>
          Card {now} / {total}
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
      : { ...base, background: "#16a34a", color: "white" };
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
