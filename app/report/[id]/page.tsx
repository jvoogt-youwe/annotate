"use client";
import { useEffect, useRef, useState } from "react";
import { use } from "react";

import { DETAIL_W, LIST_W, genId } from "../../lib/theme";
import { generateExportHTML } from "../../lib/exportHtml";
import type { Annotation, Device, Overview, Page, Report } from "../../lib/types";

import { AddPageModal, type NewPageForm } from "../../components/report/AddPageModal";
import { ReportHeader } from "../../components/report/ReportHeader";
import { PagesSidebar } from "../../components/report/PagesSidebar";
import { OverviewEditor } from "../../components/report/OverviewEditor";
import { PageEditor } from "../../components/report/PageEditor";
import { CommentDetail } from "../../components/report/CommentDetail";
import { CommentsList } from "../../components/report/CommentsList";
import { BottomToolbar } from "../../components/report/BottomToolbar";

// ─── MAIN REPORT PAGE ─────────────────────────────────────────────────────────
export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [readonly, setReadonly] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<string | null>(null);
  const [addPageModal, setAddPageModal] = useState(false);
  const [newPageForm, setNewPageForm] = useState<NewPageForm>({ name: "", url: "", devices: ["desktop", "mobile"] });
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [showOverview, setShowOverview] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "1"
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("annotate-password");
    if (saved) setPassword(saved);
    const p = new URLSearchParams(window.location.search);
    if (p.get("view") === "1") setReadonly(true);
  }, []);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject("Not found"))
      .then(data => {
        setReport(data);
        const isReadonly = new URLSearchParams(window.location.search).get("view") === "1";
        if (!isReadonly) setActivePageId(data.pages?.[0]?.id || null);
        setLoading(false);
      })
      .catch(() => { setError("Report not found."); setLoading(false); });
  }, [id]);

  function updatePage(updatedPage: Page) {
    if (!report) return;
    const pages = report.pages.map((p: Page) => p.id === updatedPage.id ? updatedPage : p);
    const updated = { ...report, pages };
    setReport(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveReport(updated), 1200);
  }

  function deletePage(pageId: string) {
    if (!report) return;
    if (!confirm("Delete this page and all its annotations?")) return;
    const pages = report.pages.filter((p: Page) => p.id !== pageId);
    const updated = { ...report, pages };
    setReport(updated);
    if (activePageId === pageId) setActivePageId(pages[0]?.id || null);
    saveReport(updated);
  }

  async function saveReport(data: Report) {
    if (!password || readonly) return;
    setSaving(true);
    try {
      await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify(data),
      });
    } catch {}
    setSaving(false);
  }

  function copyShareLink() {
    const url = `${window.location.origin}/report/${id}?view=1`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function exportHTML() {
    if (!report) return;
    const shareUrl = `${window.location.origin}/report/${id}?view=1`;
    const html = generateExportHTML(report, shareUrl);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `youwe-annotate-${report.siteName.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function addManualPage() {
    setNewPageForm({ name: "", url: "", devices: ["desktop", "mobile"] });
    setCaptureError("");
    setAddPageModal(true);
  }

  async function submitNewPage() {
    if (!report) return;
    const { name, url, devices } = newPageForm;
    if (!name.trim() || devices.length === 0) return;
    const newPages: Page[] = devices.map(device => ({ id: genId(), name: name.trim(), url: url.trim(), device, screenshotUrl: "", annotations: [] }));
    const updated = { ...report, pages: [...report.pages, ...newPages] };
    setReport(updated);
    setActivePageId(newPages[0].id);
    setAddPageModal(false);
    await saveReport(updated);
  }

  async function captureNewPage() {
    if (!report) return;
    const { name, url, devices } = newPageForm;
    if (!name.trim() || !url.trim() || devices.length === 0 || !password) return;
    setCapturing(true);
    setCaptureError("");
    try {
      const newPages: Page[] = [];
      // Sequential, not concurrent — running two thorough captures at once was found
      // to contend for CPU and be slower overall than one at a time (see app/api/reports/route.ts).
      for (const device of devices) {
        const res = await fetch("/api/capture-page", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-audit-password": password },
          body: JSON.stringify({ url: url.trim(), device }),
        });
        const data = await res.json();
        if (res.ok) newPages.push({ id: genId(), name: name.trim(), url: url.trim(), device, screenshotUrl: data.url, annotations: [] });
      }
      if (newPages.length === 0) throw new Error("Failed to capture screenshot for any selected device");
      const updated = { ...report, pages: [...report.pages, ...newPages] };
      setReport(updated);
      setActivePageId(newPages[0].id);
      setAddPageModal(false);
      await saveReport(updated);
    } catch (e: any) {
      setCaptureError(e.message || "Failed to capture screenshot");
    } finally {
      setCapturing(false);
    }
  }

  function updatePageMeta(pageId: string, name: string, url: string, device: Device) {
    if (!report) return;
    const pages = report.pages.map((p: Page) => p.id === pageId ? { ...p, name, url, device } : p);
    const updated = { ...report, pages };
    setReport(updated);
    saveReport(updated);
  }

  function updateOverview(overview: Overview) {
    if (!report) return;
    const updated = { ...report, overview };
    setReport(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveReport(updated), 1200);
  }

  function closeComments() {
    setCommentsOpen(false);
  }

  function saveAnnotationFromDetail(updatedAnnotation: Annotation) {
    if (!activePage || !report) return;
    const pages = report.pages.map((p: Page) => {
      if (p.id !== activePage.id) return p;
      const exists = p.annotations.some((a: Annotation) => a.id === updatedAnnotation.id);
      const annotations = exists
        ? p.annotations.map((a: Annotation) => a.id === updatedAnnotation.id ? updatedAnnotation : a)
        : [...p.annotations, { ...updatedAnnotation, number: p.annotations.length + 1 }];
      return { ...p, annotations };
    });
    const updated = { ...report, pages };
    setReport(updated);
    setSelectedAnnotation(updatedAnnotation);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveReport(updated), 1200);
  }

  function selectAnnotation(a: Annotation) {
    setSelectedAnnotation(a);
    setHighlightedAnnotationId(a.id);
  }

  function deleteAnnotationFromDetail(annotationId: string) {
    if (!activePage || !report) return;
    const pages = report.pages.map((p: Page) => {
      if (p.id !== activePage.id) return p;
      return { ...p, annotations: p.annotations.filter((a: Annotation) => a.id !== annotationId).map((a: Annotation, i: number) => ({ ...a, number: i + 1 })) };
    });
    const updated = { ...report, pages };
    setReport(updated);
    setSelectedAnnotation(null);
    setHighlightedAnnotationId(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveReport(updated), 1200);
  }

  function handleClientNotesSaved(pageId: string, annotationId: string, notes: string) {
    if (!report) return;
    const pages = report.pages.map((p: Page) => {
      if (p.id !== pageId) return p;
      return { ...p, annotations: p.annotations.map((a: Annotation) => a.id === annotationId ? { ...a, clientNotes: notes } : a) };
    });
    setReport({ ...report, pages });
  }

  if (loading) return (
    <div className="min-h-screen bg-brand-ink flex items-center justify-center">
      <div className="w-9 h-9 border-4 border-brand-ink-mid border-t-brand-red rounded-full animate-spin" />
    </div>
  );

  if (error || !report) return (
    <div className="min-h-screen bg-brand-off-white flex items-center justify-center">
      <p className="text-brand-red font-bold text-sm">{error}</p>
    </div>
  );

  const activePage = report.pages.find((p: Page) => p.id === activePageId);
  // Always show the freshest version of the selected annotation
  const currentSelected = activePage?.annotations?.find((a: Annotation) => a.id === selectedAnnotation?.id) ?? selectedAnnotation;

  return (
    <div className="font-[Inter,'Helvetica_Neue',Arial,sans-serif] bg-brand-off-white h-screen flex flex-col overflow-hidden">

      {addPageModal && (
        <AddPageModal
          newPageForm={newPageForm}
          setNewPageForm={setNewPageForm}
          capturing={capturing}
          captureError={captureError}
          onClose={() => setAddPageModal(false)}
          onCapture={captureNewPage}
          onAddWithoutCapture={submitNewPage}
        />
      )}

      <ReportHeader
        report={report}
        readonly={readonly}
        saving={saving}
        copied={copied}
        editingTitle={editingTitle}
        titleInput={titleInput}
        onStartEditTitle={() => { setTitleInput(report.siteName); setEditingTitle(true); }}
        onTitleChange={val => {
          setTitleInput(val);
          if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
          titleSaveTimer.current = setTimeout(() => {
            const name = val.trim();
            if (name) { const updated = { ...report, siteName: name }; setReport(updated); saveReport(updated); }
          }, 400);
        }}
        onTitleBlur={() => {
          const name = titleInput.trim();
          if (name) {
            const updated = { ...report, siteName: name };
            setReport(updated);
            saveReport(updated);
          }
          setEditingTitle(false);
        }}
        onTitleKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingTitle(false); }}
        onAddPage={addManualPage}
        onCopyShareLink={copyShareLink}
        onExport={exportHTML}
        onSignOut={() => { sessionStorage.removeItem("annotate-password"); window.location.href = "/"; }}
      />

      {/* ── BODY ROW ── */}
      <div className="flex flex-1 overflow-hidden">

        <PagesSidebar
          pages={report.pages}
          activePageId={activePageId}
          showOverview={showOverview}
          readonly={readonly}
          onShowOverview={() => { setShowOverview(true); setActivePageId(null); setCommentsOpen(false); setSelectedAnnotation(null); setHighlightedAnnotationId(null); }}
          onSelectPage={pid => { setActivePageId(pid); setShowOverview(false); }}
          onDeletePage={deletePage}
        />

        {/* Main content */}
        <main className="flex-1 px-7 py-6 min-w-0 overflow-y-auto">
          {showOverview ? (
            <OverviewEditor
              overview={report.overview}
              onSave={updateOverview}
              readonly={readonly}
              report={report}
              password={password}
            />
          ) : activePage ? (
            <PageEditor
              page={activePage}
              onUpdate={updatePage}
              onMetaUpdate={(name, url, device) => updatePageMeta(activePage.id, name, url, device)}
              password={password}
              readonly={readonly}
              highlightedAnnotationId={highlightedAnnotationId}
              onSelectAnnotation={selectAnnotation}
            />
          ) : (
            <p className="text-brand-muted text-sm">Select a page from the sidebar.</p>
          )}
        </main>

        {/* Comment detail panel — slides in between main and list */}
        <div className="transition-[width] duration-[220ms] ease overflow-hidden shrink-0" style={{ width: currentSelected ? DETAIL_W : 0 }}>
          {currentSelected && (
            <CommentDetail
              key={currentSelected.id}
              annotation={currentSelected}
              page={activePage}
              onClose={() => { setSelectedAnnotation(null); setHighlightedAnnotationId(null); }}
              onSave={saveAnnotationFromDetail}
              onDelete={deleteAnnotationFromDetail}
              readonly={readonly}
              reportId={id}
              password={password}
              isNew={!activePage?.annotations?.some((a: Annotation) => a.id === currentSelected.id)}
              onClientNotesSaved={(annotationId, notes) => activePage && handleClientNotesSaved(activePage.id, annotationId, notes)}
            />
          )}
        </div>

        {/* Comments list — rightmost drawer */}
        <div className="transition-[width] duration-[220ms] ease overflow-hidden shrink-0"
          style={{ width: commentsOpen ? LIST_W : 0, borderLeft: commentsOpen ? "1px solid #e8e8e8" : "none" }}>
          {commentsOpen && activePage && (
            <CommentsList
              page={activePage}
              selectedId={selectedAnnotation?.id ?? null}
              onSelect={a => { setSelectedAnnotation(a); setHighlightedAnnotationId(a.id); }}
              highlightedId={highlightedAnnotationId}
              onHighlight={setHighlightedAnnotationId}
              onClose={closeComments}
            />
          )}
        </div>

      </div>

      {/* Fixed toolbar */}
      <BottomToolbar
        annotationCount={activePage?.annotations?.length ?? 0}
        commentsOpen={commentsOpen}
        onToggleComments={() => {
          if (commentsOpen) closeComments();
          else setCommentsOpen(true);
        }}
      />

    </div>
  );
}
