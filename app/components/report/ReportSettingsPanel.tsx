import { useEffect, useState } from "react";
import { LBL_CLASS } from "../../lib/theme";

// ─── REPORT SETTINGS PANEL ────────────────────────────────────────────────────
// Lets the user connect a Jira project so findings can be pushed as tickets.
export function ReportSettingsPanel({
  password, onClose, onJiraConfigChange,
}: {
  password: string;
  onClose: () => void;
  onJiraConfigChange?: (configured: boolean) => void;
}) {
  const [jiraLoading, setJiraLoading] = useState(true);
  const [jiraConfigured, setJiraConfigured] = useState(false);
  const [jiraForm, setJiraForm] = useState({ siteUrl: "", apiToken: "", projectKey: "" });
  const [jiraSaving, setJiraSaving] = useState(false);
  const [jiraError, setJiraError] = useState("");
  const [jiraSaved, setJiraSaved] = useState(false);

  useEffect(() => {
    fetch("/api/jira", { headers: { "x-audit-password": password } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setJiraConfigured(data.configured);
        if (data.configured) setJiraForm(f => ({ ...f, siteUrl: data.siteUrl, projectKey: data.projectKey }));
      })
      .finally(() => setJiraLoading(false));
  }, [password]);

  async function submitJira() {
    if (jiraSaving || !jiraForm.siteUrl.trim() || !jiraForm.projectKey.trim()) return;
    setJiraSaving(true);
    setJiraError("");
    try {
      const res = await fetch("/api/jira", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify(jiraForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save Jira connection");
      setJiraConfigured(true);
      setJiraForm(f => ({ ...f, apiToken: "" }));
      setJiraSaved(true);
      onJiraConfigChange?.(true);
    } catch (e: any) {
      setJiraError(e.message || "Failed to save Jira connection");
    } finally {
      setJiraSaving(false);
    }
  }

  async function disconnectJira() {
    if (jiraSaving) return;
    setJiraSaving(true);
    setJiraError("");
    try {
      const res = await fetch("/api/jira", { method: "DELETE", headers: { "x-audit-password": password } });
      if (!res.ok) throw new Error("Failed to disconnect Jira");
      setJiraConfigured(false);
      setJiraForm({ siteUrl: "", apiToken: "", projectKey: "" });
      onJiraConfigChange?.(false);
    } catch (e: any) {
      setJiraError(e.message || "Failed to disconnect Jira");
    } finally {
      setJiraSaving(false);
    }
  }

  const fieldClass = "w-full bg-brand-off-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2.5 text-[13px] font-[Arial,sans-serif] text-[#151515] outline-none box-border";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45" onClick={onClose}>
      <div className="bg-brand-white rounded-xl w-[440px] max-h-[85vh] overflow-y-auto p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col gap-[18px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-brand-ink">Report settings</p>
          <button onClick={onClose} className="bg-transparent border-none text-[22px] leading-none px-1.5 py-0.5 text-[#767676]" style={{ cursor: "pointer" }}>×</button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className={`${LBL_CLASS} mb-0`}>Jira integration</label>
            {!jiraLoading && (
              <span className="text-xs font-bold" style={{ color: jiraConfigured ? "#008760" : "#9a9a9a" }}>
                {jiraConfigured ? "● Connected" : "Not connected"}
              </span>
            )}
          </div>
          <p className="text-xs text-brand-muted -mt-1.5 leading-normal">
            Connect a self-hosted Jira (Server/Data Center) project using a Personal Access Token, so findings can be pushed as tickets from a page's findings list.
          </p>

          {!jiraLoading && (
            <>
              <input value={jiraForm.siteUrl} onChange={e => setJiraForm(f => ({ ...f, siteUrl: e.target.value }))}
                placeholder="https://jira.yourcompany.com" className={fieldClass} />
              <input value={jiraForm.apiToken} onChange={e => setJiraForm(f => ({ ...f, apiToken: e.target.value }))}
                type="password" placeholder={jiraConfigured ? "Personal Access Token (leave blank to keep current)" : "Personal Access Token"} className={fieldClass} />
              <input value={jiraForm.projectKey} onChange={e => setJiraForm(f => ({ ...f, projectKey: e.target.value.toUpperCase() }))}
                placeholder="Project key, e.g. PROJ" className={fieldClass} />

              {jiraError && <p className="text-xs text-brand-red m-0">{jiraError}</p>}
              {jiraSaved && !jiraError && <p className="text-xs m-0" style={{ color: "#008760" }}>Jira connection saved.</p>}

              <div className="flex justify-between gap-2.5">
                {jiraConfigured ? (
                  <button onClick={disconnectJira} disabled={jiraSaving}
                    className="bg-brand-off-white text-brand-red border-[1.5px] border-brand-border rounded-lg px-3.5 py-2 text-[13px] font-bold cursor-pointer">
                    Disconnect
                  </button>
                ) : <span />}
                <button onClick={submitJira} disabled={jiraSaving || !jiraForm.siteUrl.trim() || !jiraForm.projectKey.trim()}
                  className="bg-brand-ink text-brand-white border-none rounded-lg px-[18px] py-2 text-[13px] font-bold"
                  style={{ cursor: jiraSaving ? "not-allowed" : "pointer", opacity: jiraSaving ? 0.7 : 1 }}>
                  {jiraSaving ? "Saving…" : "Save connection"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
