import { useState } from "react";
import { LBL_CLASS } from "../../lib/theme";

// ─── REPORT SETTINGS PANEL ────────────────────────────────────────────────────
// Lets the owning client (or admin) change this report's client password.
export function ReportSettingsPanel({
  clientId, password, onClose,
}: {
  clientId: string;
  password: string;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit() {
    if (!newPassword.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      setSaved(true);
      setNewPassword("");
    } catch (e: any) {
      setError(e.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45" onClick={onClose}>
      <div className="bg-brand-white rounded-xl w-[420px] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col gap-[18px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-brand-ink">Report settings</p>
          <button onClick={onClose} className="bg-transparent border-none text-[22px] leading-none px-1.5 py-0.5 text-[#767676]" style={{ cursor: "pointer" }}>×</button>
        </div>

        <div>
          <label className={LBL_CLASS}>Change client password</label>
          <input
            type="text" value={newPassword} onChange={e => { setNewPassword(e.target.value); setSaved(false); }}
            placeholder="New password"
            className="w-full bg-brand-off-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2.5 text-[13px] font-[Arial,sans-serif] text-[#151515] outline-none box-border"
          />
        </div>

        {error && <p className="text-xs text-brand-red m-0">{error}</p>}
        {saved && <p className="text-xs m-0" style={{ color: "#008760" }}>Password updated.</p>}

        <div className="flex justify-end">
          <button onClick={submit} disabled={!newPassword.trim() || saving}
            className="bg-brand-red text-brand-white border-none rounded-lg px-[18px] py-[9px] text-[13px] font-bold"
            style={{ cursor: (!newPassword.trim() || saving) ? "not-allowed" : "pointer", opacity: !newPassword.trim() ? 0.5 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
