"use client";
import { useEffect, useState } from "react";
import { YouweLogo } from "../components/YouweLogo";
import { RevealPasswordModal } from "../components/RevealPasswordModal";
import { LBL_CLASS, FIELD_CLASS } from "../lib/theme";

interface ClientRow {
  id: string;
  name: string;
  createdAt: string | null;
  isLegacy?: boolean;
}

interface ReportRow {
  id: string;
  siteName: string;
  url: string;
  clientId: string;
}

export default function ClientsPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [authorised, setAuthorised] = useState<"checking" | "yes" | "no">("checking");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [revealing, setRevealing] = useState<{ name: string; password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingClient, setDeletingClient] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [reassigningId, setReassigningId] = useState<string | null>(null);

  function loadAll(pw: string) {
    Promise.all([
      fetch("/api/clients", { headers: { "x-audit-password": pw } }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch("/api/reports", { headers: { "x-audit-password": pw } }).then(r => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([clientsData, reportsData]) => {
        setAuthorised("yes");
        setClients(clientsData.clients || []);
        setReports(reportsData.reports || []);
      })
      .catch(() => setAuthorised("no"));
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("annotate-password");
    if (!saved) { setAuthorised("no"); return; }
    setPassword(saved);
    loadAll(saved);
  }, []);

  async function resetPassword(client: ClientRow) {
    if (!password) return;
    setResettingId(client.id);
    setError("");
    try {
      const res = await fetch(`/api/clients/${client.id}/reset-password`, {
        method: "POST",
        headers: { "x-audit-password": password },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setRevealing({ name: client.name, password: data.password });
    } catch (e: any) {
      setError(e.message || "Failed to reset password");
    } finally {
      setResettingId(null);
    }
  }

  async function createClient() {
    if (!password || !newName.trim() || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify({ name: newName.trim(), password: newPassword.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create client");
      setClients(prev => [...prev, { id: data.client.id, name: data.client.name, createdAt: data.client.createdAt }]);
      setNewClientOpen(false);
      setNewName("");
      setNewPassword("");
      setRevealing({ name: data.client.name, password: data.password });
    } catch (e: any) {
      setCreateError(e.message || "Failed to create client");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(client: ClientRow) {
    setEditingClient(client);
    setEditName(client.name);
    setEditError("");
  }

  async function saveEdit() {
    if (!password || !editingClient || !editName.trim() || savingEdit) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename client");
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, name: editName.trim() } : c));
      setEditingClient(null);
    } catch (e: any) {
      setEditError(e.message || "Failed to rename client");
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!password || !deletingClient || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/clients/${deletingClient.id}`, {
        method: "DELETE",
        headers: { "x-audit-password": password },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete client");
      setClients(prev => prev.filter(c => c.id !== deletingClient.id));
      setReports(prev => prev.map(r => r.clientId === deletingClient.id ? { ...r, clientId: "legacy" } : r));
      setDeletingClient(null);
    } catch (e: any) {
      setDeleteError(e.message || "Failed to delete client");
    } finally {
      setDeleting(false);
    }
  }

  async function reassignReport(reportId: string, clientId: string) {
    if (!password) return;
    setReassigningId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}/assign-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) throw new Error();
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, clientId } : r));
    } catch {
      setError("Failed to reassign report.");
    } finally {
      setReassigningId(null);
    }
  }

  if (authorised === "checking") return null;

  if (authorised === "no") {
    return (
      <div className="min-h-screen bg-brand-ink flex items-center justify-center px-6">
        <p className="text-brand-white text-sm">Admin access required. <a href="/" className="text-brand-red">Go back</a></p>
      </div>
    );
  }

  const reportCount = (clientId: string) => reports.filter(r => (r.clientId || "legacy") === clientId).length;

  return (
    <div className="font-[Inter,'Helvetica_Neue',Arial,sans-serif] bg-brand-off-white min-h-screen">
      <header className="bg-brand-ink border-b-2 border-brand-red">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="no-underline"><YouweLogo height={38} /></a>
          <a href="/" className="text-xs text-brand-muted no-underline">← Back to reports</a>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-black text-brand-ink">Manage clients</h1>
          <button
            onClick={() => setNewClientOpen(true)}
            className="bg-brand-red text-brand-white border-none rounded-lg px-4 py-2 font-bold text-[13px]"
            style={{ cursor: "pointer" }}
          >
            + New client
          </button>
        </div>
        <p className="text-sm text-brand-muted mb-8">Each client has their own password. Resetting a password immediately invalidates the old one. Deleting a client moves its reports to Legacy.</p>

        {error && <p className="text-xs text-brand-red mb-4">{error}</p>}

        <div className="flex flex-col gap-2 mb-10">
          {clients.map(c => (
            <div key={c.id} className="bg-white border border-brand-border rounded-lg px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-brand-ink">{c.name}</p>
                <p className="text-xs text-brand-muted">
                  {c.isLegacy
                    ? `Pre-migration reports with no assigned client · ${reportCount(c.id)} report${reportCount(c.id) === 1 ? "" : "s"}`
                    : `Created ${c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""} · ${reportCount(c.id)} report${reportCount(c.id) === 1 ? "" : "s"}`}
                </p>
              </div>
              {!c.isLegacy && (
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="text-xs font-bold text-brand-ink bg-transparent border-[1.5px] border-brand-border rounded-md px-3 py-1.5"
                    style={{ cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => resetPassword(c)}
                    disabled={resettingId === c.id}
                    className="text-xs font-bold text-brand-ink bg-transparent border-[1.5px] border-brand-border rounded-md px-3 py-1.5"
                    style={{ cursor: resettingId === c.id ? "not-allowed" : "pointer" }}
                  >
                    {resettingId === c.id ? "Resetting…" : "Reset password"}
                  </button>
                  <button
                    onClick={() => { setDeletingClient(c); setDeleteError(""); }}
                    className="text-xs font-bold text-brand-red bg-transparent border-[1.5px] border-brand-border rounded-md px-3 py-1.5"
                    style={{ cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <h2 className="text-lg font-black text-brand-ink mb-1">Reports</h2>
        <p className="text-sm text-brand-muted mb-4">Reassign a report to a different client.</p>
        <div className="flex flex-col gap-2">
          {reports.map(r => (
            <div key={r.id} className="bg-white border border-brand-border rounded-lg px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-brand-ink truncate">{r.siteName || r.url}</p>
                <p className="text-xs text-brand-muted truncate">{r.url}</p>
              </div>
              <select
                value={r.clientId || "legacy"}
                onChange={e => reassignReport(r.id, e.target.value)}
                disabled={reassigningId === r.id}
                className="text-xs font-semibold text-brand-ink border-[1.5px] border-brand-border rounded-md px-2 py-1.5 bg-brand-off-white shrink-0"
              >
                <option value="legacy">Legacy</option>
                {clients.filter(c => !c.isLegacy).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </main>

      {newClientOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45" onClick={() => !creating && setNewClientOpen(false)}>
          <div className="bg-brand-white rounded-xl w-[420px] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col gap-[18px]" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-brand-ink">New client</p>
            <div className="flex flex-col gap-3.5">
              <div>
                <label className={LBL_CLASS}>Client name</label>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. G-STAR" className={FIELD_CLASS} />
              </div>
              <div>
                <label className={LBL_CLASS}>Password (optional — generated if left blank)</label>
                <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to generate" className={FIELD_CLASS} />
              </div>
            </div>
            {createError && <p className="text-xs text-brand-red m-0">{createError}</p>}
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setNewClientOpen(false)} disabled={creating}
                className="bg-transparent border-[1.5px] border-brand-border rounded-lg px-[18px] py-[9px] text-[13px] font-bold text-brand-ink"
                style={{ cursor: creating ? "not-allowed" : "pointer" }}>
                Cancel
              </button>
              <button onClick={createClient} disabled={!newName.trim() || creating}
                className="bg-brand-red text-brand-white border-none rounded-lg px-[18px] py-[9px] text-[13px] font-bold"
                style={{ cursor: (!newName.trim() || creating) ? "not-allowed" : "pointer" }}>
                {creating ? "Creating…" : "Create client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingClient && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45" onClick={() => !savingEdit && setEditingClient(null)}>
          <div className="bg-brand-white rounded-xl w-[420px] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col gap-[18px]" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-brand-ink">Edit client</p>
            <div>
              <label className={LBL_CLASS}>Client name</label>
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} className={FIELD_CLASS} />
            </div>
            {editError && <p className="text-xs text-brand-red m-0">{editError}</p>}
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setEditingClient(null)} disabled={savingEdit}
                className="bg-transparent border-[1.5px] border-brand-border rounded-lg px-[18px] py-[9px] text-[13px] font-bold text-brand-ink"
                style={{ cursor: savingEdit ? "not-allowed" : "pointer" }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={!editName.trim() || savingEdit}
                className="bg-brand-red text-brand-white border-none rounded-lg px-[18px] py-[9px] text-[13px] font-bold"
                style={{ cursor: (!editName.trim() || savingEdit) ? "not-allowed" : "pointer" }}>
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingClient && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45" onClick={() => !deleting && setDeletingClient(null)}>
          <div className="bg-brand-white rounded-xl w-[420px] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col gap-[18px]" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-brand-ink">Delete {deletingClient.name}?</p>
            <p className="text-xs text-brand-muted -mt-2.5">
              {reportCount(deletingClient.id) > 0
                ? `This client has ${reportCount(deletingClient.id)} report${reportCount(deletingClient.id) === 1 ? "" : "s"} — they'll be moved to Legacy, not deleted. The client's password will stop working.`
                : "The client's password will stop working. This can't be undone."}
            </p>
            {deleteError && <p className="text-xs text-brand-red m-0">{deleteError}</p>}
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setDeletingClient(null)} disabled={deleting}
                className="bg-transparent border-[1.5px] border-brand-border rounded-lg px-[18px] py-[9px] text-[13px] font-bold text-brand-ink"
                style={{ cursor: deleting ? "not-allowed" : "pointer" }}>
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="bg-brand-red text-brand-white border-none rounded-lg px-[18px] py-[9px] text-[13px] font-bold"
                style={{ cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {revealing && (
        <RevealPasswordModal
          clientName={revealing.name}
          password={revealing.password}
          onClose={() => setRevealing(null)}
        />
      )}
    </div>
  );
}
