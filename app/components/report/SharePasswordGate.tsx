"use client";
import { useState } from "react";
import { YouweLogo } from "../YouweLogo";

// ─── SHARE PASSWORD GATE ───────────────────────────────────────────────────────
// Shown to a share-link visitor when the report they're opening has been
// protected with a client-facing password (see ShareLinkModal).
export function SharePasswordGate({ onSubmit, error, checking }: {
  onSubmit: (password: string) => void;
  error: string;
  checking: boolean;
}) {
  const [val, setVal] = useState("");

  function submit() {
    if (!val.trim() || checking) return;
    onSubmit(val.trim());
  }

  return (
    <div className="min-h-screen bg-brand-ink flex items-center justify-center p-6">
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-10 max-w-[400px] w-full">
        <YouweLogo height={32} />
        <h1 className="text-[22px] font-black text-brand-white mt-6 mb-1.5">Password protected</h1>
        <p className="text-[13px] text-brand-muted mb-7">This report is protected. Enter the password to view it.</p>
        <input
          type="password" placeholder="Password" autoFocus
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          className="w-full bg-brand-ink border-[1.5px] border-[#333] rounded-lg px-4 py-3 text-sm mb-3 placeholder:text-[#9a9a9a]"
          style={{ color: "#ffffff" }}
        />
        {error && <p className="text-xs text-brand-red mb-3">{error}</p>}
        <button onClick={submit} disabled={checking}
          className="w-full text-brand-white border-none rounded-lg py-3.5 font-extrabold text-sm"
          style={{ background: checking ? "#333" : "#e40046", cursor: checking ? "not-allowed" : "pointer" }}>
          {checking ? "Checking…" : "View report →"}
        </button>
      </div>
    </div>
  );
}
