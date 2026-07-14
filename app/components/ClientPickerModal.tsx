import { useState } from "react";
import { LBL_CLASS, FIELD_CLASS } from "../lib/theme";
import { RevealPasswordModal } from "./RevealPasswordModal";

interface ClientOption { id: string; name: string }

// ─── CLIENT PICKER MODAL ──────────────────────────────────────────────────────
// Admin-only: pick an existing client to create a report under, or create a new
// client (with a password) inline before proceeding.
export function ClientPickerModal({
  clients, onCancel, onSelect, onCreate,
}: {
  clients: ClientOption[];
  onCancel: () => void;
  onSelect: (clientId: string) => void;
  onCreate: (name: string, password?: string) => Promise<{ id: string; name: string; password: string }>;
}) {
  const [mode, setMode] = useState<"pick" | "create">(clients.length === 0 ? "create" : "pick");
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string; password: string } | null>(null);

  async function submitCreate() {
    if (!name.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const client = await onCreate(name.trim(), password.trim() || undefined);
      setCreated(client);
    } catch (e: any) {
      setError(e.message || "Failed to create client");
    } finally {
      setCreating(false);
    }
  }

  if (created) {
    return (
      <RevealPasswordModal
        clientName={created.name}
        password={created.password}
        onClose={() => onSelect(created.id)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45" onClick={onCancel}>
      <div className="bg-brand-white rounded-xl w-[420px] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col gap-[18px]" onClick={e => e.stopPropagation()}>
        <p className="text-[15px] font-bold text-brand-ink">Which client is this report for?</p>

        {clients.length > 0 && (
          <div className="flex gap-2 text-[13px] font-semibold">
            <button onClick={() => setMode("pick")} className="border-none rounded-md px-3 py-1.5" style={{ cursor: "pointer", background: mode === "pick" ? "#151515" : "#f0f0f0", color: mode === "pick" ? "#fff" : "#151515" }}>
              Existing client
            </button>
            <button onClick={() => setMode("create")} className="border-none rounded-md px-3 py-1.5" style={{ cursor: "pointer", background: mode === "create" ? "#151515" : "#f0f0f0", color: mode === "create" ? "#fff" : "#151515" }}>
              + New client
            </button>
          </div>
        )}

        {mode === "pick" ? (
          <div>
            <label className={LBL_CLASS}>Client</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={FIELD_CLASS}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div>
              <label className={LBL_CLASS}>Client name</label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. G-STAR" className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LBL_CLASS}>Password (optional — generated if left blank)</label>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to generate" className={FIELD_CLASS} />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-brand-red m-0">{error}</p>}

        <div className="flex gap-2.5 justify-end">
          <button onClick={onCancel} className="bg-transparent border-[1.5px] border-brand-border rounded-lg px-[18px] py-[9px] text-[13px] font-bold text-brand-ink" style={{ cursor: "pointer" }}>
            Cancel
          </button>
          {mode === "pick" ? (
            <button onClick={() => selectedId && onSelect(selectedId)} disabled={!selectedId}
              className="bg-brand-red text-brand-white border-none rounded-lg px-[18px] py-[9px] text-[13px] font-bold" style={{ cursor: selectedId ? "pointer" : "not-allowed" }}>
              Continue
            </button>
          ) : (
            <button onClick={submitCreate} disabled={!name.trim() || creating}
              className="bg-brand-red text-brand-white border-none rounded-lg px-[18px] py-[9px] text-[13px] font-bold" style={{ cursor: (!name.trim() || creating) ? "not-allowed" : "pointer" }}>
              {creating ? "Creating…" : "Create client"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
