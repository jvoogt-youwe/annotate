"use client";
import { useState, useEffect } from "react";

const B = {
  red: "#e40046", ink: "#151515", inkMid: "#2a2a2a",
  white: "#ffffff", offWhite: "#f7f7f8", muted: "#9a9a9a",
  border: "#e8e8e8", blue: "#76B4FD",
};

function YouweLogo({ height = 36 }: { height?: number }) {
  return <img src="/youwe-logo.svg" height={height} alt="Youwe" />;
}

function PasswordGate({ onAuth }: { onAuth: (p: string) => void }) {
  const [val, setVal] = useState("");

  function submit() {
    if (!val.trim()) return;
    onAuth(val.trim());
  }

  return (
    <div style={{ minHeight: "100vh", background: B.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 16, padding: 40, maxWidth: 400, width: "100%" }}>
        <YouweLogo height={32} />
        <h1 style={{ fontSize: 22, fontWeight: 900, color: B.white, marginTop: 24, marginBottom: 6 }}>UX Annotate</h1>
        <p style={{ fontSize: 13, color: B.muted, marginBottom: 28 }}>Enter the team password to continue.</p>
        <input
          type="password" placeholder="Password"
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          style={{ width: "100%", background: "#151515", border: "1.5px solid #333", borderRadius: 8, padding: "12px 16px", color: B.white, fontSize: 14, marginBottom: 12 }}
        />
        <button onClick={submit} style={{ width: "100%", background: B.red, color: B.white, border: "none", borderRadius: 8, padding: "13px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          Enter →
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [password, setPassword] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [recentReports, setRecentReports] = useState<any[]>([]);

  const MSGS = [
    "Detecting key page types…",
    "Capturing homepage screenshots…",
    "Capturing category & listing pages…",
    "Capturing product & checkout pages…",
    "Processing screenshots…",
    "Preparing report…",
  ];

  useEffect(() => {
    const saved = sessionStorage.getItem("annotate-password");
    if (saved) setPassword(saved);
  }, []);

  useEffect(() => {
    if (!password) return;
    fetch("/api/reports", { headers: { "x-audit-password": password } })
      .then(r => r.ok ? r.json() : { reports: [] })
      .then(d => setRecentReports(d.reports || []))
      .catch(() => {});
  }, [password]);

  function handleAuth(p: string) {
    sessionStorage.setItem("annotate-password", p);
    setPassword(p);
  }

  async function handleStart() {
    if (!url.trim() || !password) return;
    setStatus("loading");
    setError("");
    let i = 0;
    setLoadingMsg(MSGS[0]);
    const iv = setInterval(() => { i = (i + 1) % MSGS.length; setLoadingMsg(MSGS[i]); }, 4000);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create report");
      window.location.href = `/report/${data.id}`;
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setStatus("error");
    } finally {
      clearInterval(iv);
    }
  }

  if (!password) return <PasswordGate onAuth={handleAuth} />;

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: B.offWhite, minHeight: "100vh" }}>
      <header style={{ background: B.ink, borderBottom: `2px solid ${B.red}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", borderBottom: "1px solid #2a2a2a" }}>
            <YouweLogo height={45} />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: B.muted, textTransform: "uppercase" }}>UX Annotate</span>
              <button onClick={() => { sessionStorage.removeItem("annotate-password"); setPassword(null); }} style={{ fontSize: 12, color: B.muted, background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
            </div>
          </div>
          <div style={{ padding: "32px 0 36px" }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: B.white, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 6 }}>Youwe Annotate<span style={{ color: B.red }}>.</span></h1>
            <p style={{ fontSize: 14, color: B.muted, marginBottom: 24, maxWidth: 520 }}>Enter a client URL to capture screenshots of all key pages and build an annotated report.</p>
            <div style={{ display: "flex", gap: 10, maxWidth: 680 }}>
              <input
                type="url" placeholder="https://client-site.co.uk"
                value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleStart()}
                disabled={status === "loading"}
                style={{ flex: 1, background: "#2a2a2a", border: "1.5px solid #555", borderRadius: 8, padding: "13px 16px", color: B.white, fontSize: 14 }}
              />
              <button
                onClick={handleStart}
                disabled={status === "loading" || !url.trim()}
                style={{ background: status === "loading" ? "#333" : B.red, color: B.white, border: "none", borderRadius: 8, padding: "13px 28px", fontWeight: 800, fontSize: 14, cursor: status === "loading" ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
              >
                {status === "loading" ? "Building…" : "Start Report →"}
              </button>
            </div>
            {status === "loading" && (
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 18, height: 18, border: `3px solid #2a2a2a`, borderTop: `3px solid ${B.red}`, borderRadius: "50%", animation: "spin 0.75s linear infinite", flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: B.muted }}>{loadingMsg}</p>
              </div>
            )}
            {status === "error" && (
              <p style={{ marginTop: 12, fontSize: 13, color: B.red }}>{error}</p>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
          {[
            {
              icon: (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M12 6H20L22 9H27C28.105 9 29 9.895 29 11V24C29 25.105 28.105 26 27 26H5C3.895 26 3 25.105 3 24V11C3 9.895 3.895 9 5 9H10L12 6Z" stroke="#e40046" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="16" cy="17" r="5" stroke="#e40046" strokeWidth="1.5"/>
                </svg>
              ),
              title: "Auto-capture",
              desc: "Screenshots of homepage, PLP, PDP, checkout and more — desktop & mobile.",
            },
            {
              icon: (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M7 5L13.5 25L17 18L24 27L27 24L20 17L27 13.5L7 5Z" stroke="#e40046" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: "Click to annotate",
              desc: "Click anywhere on a screenshot to pin a finding. AI can suggest findings automatically.",
            },
            {
              icon: (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 19V7M10 13L16 7L22 13" stroke="#e40046" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 22V26H26V22" stroke="#e40046" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: "Export & share",
              desc: "Generate a shareable link or download an HTML report to send to clients.",
            },
          ].map(f => (
            <div key={f.title} style={{ background: B.white, borderRadius: 12, border: `1px solid ${B.border}`, padding: 20 }}>
              <div style={{ marginBottom: 12 }}>{f.icon}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: B.ink, marginBottom: 6 }}>{f.title}</p>
              <p style={{ fontSize: 13, color: B.muted, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {recentReports.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: B.muted, marginBottom: 12 }}>Recent reports</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentReports.map((r: any) => (
                <a key={r.id} href={`/report/${r.id}`} style={{ background: B.white, border: `1px solid ${B.border}`, borderRadius: 8, padding: "14px 18px", textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: B.ink, marginBottom: 2 }}>{r.siteName || r.url}</p>
                    <p style={{ fontSize: 11, color: B.muted }}>{r.url} · {r.pages?.length || 0} pages</p>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: B.muted }}>{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    <span style={{ fontSize: 13, color: B.muted }}>→</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
