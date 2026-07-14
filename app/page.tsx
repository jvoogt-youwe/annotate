"use client";
import { useState, useEffect } from "react";
import { YouweLogo } from "./components/YouweLogo";
import { ClientPickerModal } from "./components/ClientPickerModal";

type Scope = { role: "admin" } | { role: "client"; clientId: string; clientName: string };

const B = {
  red: "#e40046", ink: "#151515", inkMid: "#2a2a2a",
  white: "#ffffff", offWhite: "#f7f7f8",
  // muted: AA-safe (>=4.5:1) on light/white surfaces. mutedOnDark: the lighter
  // brand grey, used where the surface is dark (it doesn't clear 4.5:1 on white).
  muted: "#767676", mutedOnDark: "#9a9a9a",
  border: "#e8e8e8", blue: "#76B4FD",
};

function ConfirmDeleteModal({ siteName, onCancel, onConfirm, deleting }: { siteName: string; onCancel: () => void; onConfirm: () => void; deleting: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 100 }}>
      <div style={{ background: B.white, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: B.ink, marginBottom: 8 }}>Delete this report?</h2>
        <p style={{ fontSize: 13, color: B.muted, marginBottom: 24, lineHeight: 1.5 }}>
          This will permanently delete the report for <strong style={{ color: B.ink }}>{siteName}</strong> and all its screenshots. This can't be undone.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={deleting} style={{ background: "none", border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "10px 18px", fontWeight: 700, fontSize: 13, color: B.ink, cursor: deleting ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{ background: B.red, border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 800, fontSize: 13, color: B.white, cursor: deleting ? "not-allowed" : "pointer" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordGate({ onAuth }: { onAuth: (p: string, scope: Scope) => void }) {
  const [val, setVal] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function submit() {
    if (!val.trim() || checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: val.trim() }),
      });
      if (!res.ok) { setError("Incorrect password."); return; }
      const scope = await res.json();
      onAuth(val.trim(), scope);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: B.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 16, padding: 40, maxWidth: 400, width: "100%" }}>
        <YouweLogo height={32} />
        <h1 style={{ fontSize: 22, fontWeight: 900, color: B.white, marginTop: 24, marginBottom: 6 }}>UX Annotate</h1>
        <p style={{ fontSize: 13, color: B.mutedOnDark, marginBottom: 28 }}>Enter your client password to continue.</p>
        <input
          type="password" placeholder="Password"
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          style={{ width: "100%", background: "#151515", border: "1.5px solid #333", borderRadius: 8, padding: "12px 16px", color: B.white, fontSize: 14, marginBottom: 12 }}
        />
        {error && <p style={{ fontSize: 12, color: B.red, marginBottom: 12 }}>{error}</p>}
        <button onClick={submit} disabled={checking} style={{ width: "100%", background: checking ? "#333" : B.red, color: B.white, border: "none", borderRadius: 8, padding: "13px", fontWeight: 800, fontSize: 14, cursor: checking ? "not-allowed" : "pointer" }}>
          {checking ? "Checking…" : "Enter →"}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [password, setPassword] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; siteName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clientPicker, setClientPicker] = useState<{ id: string; name: string }[] | null>(null);

  const MSGS = [
    "Capturing homepage screenshots…",
    "Processing screenshots…",
    "Preparing report…",
  ];

  // Re-validate on every load rather than trusting a stale session — a client's
  // password may have been reset since this tab last checked.
  useEffect(() => {
    const saved = sessionStorage.getItem("annotate-password");
    if (!saved) return;
    fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: saved }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(s => {
        if (s) { setPassword(saved); setScope(s); }
        else sessionStorage.removeItem("annotate-password");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!password) return;
    fetch("/api/reports", { headers: { "x-audit-password": password } })
      .then(r => {
        if (r.status === 401) { sessionStorage.removeItem("annotate-password"); setPassword(null); setScope(null); return { reports: [] }; }
        return r.ok ? r.json() : { reports: [] };
      })
      .then(d => setRecentReports(d.reports || []))
      .catch(() => {});
  }, [password]);

  function handleAuth(p: string, s: Scope) {
    sessionStorage.setItem("annotate-password", p);
    setPassword(p);
    setScope(s);
  }

  async function createReport(clientId?: string) {
    setStatus("loading");
    setError("");
    let i = 0;
    setLoadingMsg(MSGS[0]);
    const iv = setInterval(() => { i = (i + 1) % MSGS.length; setLoadingMsg(MSGS[i]); }, 4000);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-password": password! },
        body: JSON.stringify({ url: url.trim(), ...(clientId ? { clientId } : {}) }),
      });
      if (!res.ok && !res.headers.get("content-type")?.includes("application/json")) {
        throw new Error(res.status === 504 ? "The report took too long to generate and timed out. Try again, or try a smaller site." : `Server error (${res.status}). Please try again.`);
      }
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

  async function handleStart() {
    if (!url.trim() || !password || !scope) return;
    if (scope.role === "client") { createReport(); return; }
    // Admin must pick or create a client before a report can be created.
    try {
      const res = await fetch("/api/clients", { headers: { "x-audit-password": password } });
      const data = await res.json();
      setClientPicker(data.clients || []);
    } catch {
      setError("Failed to load clients.");
      setStatus("error");
    }
  }

  async function handleCreateClient(name: string, clientPassword?: string) {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-audit-password": password! },
      body: JSON.stringify({ name, password: clientPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create client");
    return { id: data.client.id, name: data.client.name, password: data.password };
  }

  async function handleDelete() {
    if (!pendingDelete || !password) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/${pendingDelete.id}`, {
        method: "DELETE",
        headers: { "x-audit-password": password },
      });
      if (!res.ok) throw new Error("Failed to delete report");
      setRecentReports(prev => prev.filter(r => r.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch {
      // leave the modal open so the user can retry or cancel
    } finally {
      setDeleting(false);
    }
  }

  if (!password || !scope) return <PasswordGate onAuth={handleAuth} />;

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: B.offWhite, minHeight: "100vh" }}>
      <header style={{ background: B.ink, borderBottom: `2px solid ${B.red}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", borderBottom: "1px solid #2a2a2a" }}>
            <YouweLogo height={45} />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: B.mutedOnDark, textTransform: "uppercase" }}>
                UX Annotate{scope.role === "client" ? ` · ${scope.clientName}` : " · Admin"}
              </span>
              {scope.role === "admin" && (
                <a href="/clients" style={{ fontSize: 12, color: B.mutedOnDark, textDecoration: "none" }}>Manage clients</a>
              )}
              <button onClick={() => { sessionStorage.removeItem("annotate-password"); setPassword(null); setScope(null); }} style={{ fontSize: 12, color: B.mutedOnDark, background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
            </div>
          </div>
          <div style={{ padding: "32px 0 36px" }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: B.white, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 6 }}>Youwe Annotate<span style={{ color: B.red }}>.</span></h1>
            <p style={{ fontSize: 14, color: B.mutedOnDark, marginBottom: 24, maxWidth: 520 }}>Enter a client URL to capture a homepage screenshot and build an annotated report. Add more pages manually as you go.</p>
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
                <p style={{ fontSize: 13, color: B.mutedOnDark }}>{loadingMsg}</p>
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
              desc: "Homepage screenshot, desktop & mobile — add more pages manually anytime.",
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
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: B.muted }}>{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setPendingDelete({ id: r.id, siteName: r.siteName || r.url }); }}
                      title="Delete report"
                      style={{ background: "none", border: "none", color: B.muted, cursor: "pointer", padding: 4, lineHeight: 1, display: "flex", alignItems: "center" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16" />
                        <path d="M9 7V4h6v3" />
                        <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                    <span style={{ fontSize: 13, color: B.muted }}>→</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      {pendingDelete && (
        <ConfirmDeleteModal
          siteName={pendingDelete.siteName}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {clientPicker && (
        <ClientPickerModal
          clients={clientPicker}
          onCancel={() => setClientPicker(null)}
          onSelect={clientId => { setClientPicker(null); createReport(clientId); }}
          onCreate={handleCreateClient}
        />
      )}
    </div>
  );
}
