"use client";
import { useEffect, useState } from "react";
import type { Annotation, DataSource, Device, Page } from "../../lib/types";
import { AnnotatedScreenshot } from "./AnnotatedScreenshot";

// ─── PAGE EDITOR ──────────────────────────────────────────────────────────────
export function PageEditor({ page, onUpdate, onMetaUpdate, password, readonly, highlightedAnnotationId, onSelectAnnotation, dataSources, jiraConfigured, onPushToJira }: {
  page: Page; onUpdate: (p: Page) => void; onMetaUpdate: (name: string, url: string, device: Device) => void;
  password: string | null; readonly: boolean; highlightedAnnotationId: string | null;
  onSelectAnnotation: (a: Annotation) => void; dataSources: DataSource[];
  jiraConfigured: boolean; onPushToJira: (annotationIds: string[]) => Promise<any>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(page.name);
  const [url, setUrl] = useState(page.url);
  const [device, setDevice] = useState<Device>(page.device || "desktop");

  useEffect(() => { setName(page.name); setUrl(page.url); setDevice(page.device || "desktop"); }, [page.id]);

  function save() {
    if (!name.trim()) return;
    onMetaUpdate(name.trim(), url.trim(), device);
    setEditing(false);
  }

  return (
    <div>
      <div className="mb-[18px] flex items-center gap-2.5 flex-wrap">
        {editing ? (
          <>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Page name"
              className="bg-brand-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2 text-sm font-bold text-brand-ink w-[200px]" />
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
              className="bg-brand-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2 text-sm text-brand-ink flex-1 min-w-[200px]" />
            <div className="relative">
              <select value={device} onChange={e => setDevice(e.target.value as Device)}
                className="bg-brand-white border-[1.5px] border-brand-border rounded-lg py-2 pl-3.5 pr-8 text-[13px] text-brand-ink cursor-pointer appearance-none">
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <button onClick={save} className="bg-brand-ink text-brand-white border-none rounded-lg px-[18px] py-2 font-bold text-[13px] cursor-pointer">Save</button>
            <button onClick={() => { setEditing(false); setName(page.name); setUrl(page.url); setDevice(page.device || "desktop"); }}
              className="bg-transparent border-[1.5px] border-brand-border rounded-lg px-3.5 py-2 text-[13px] text-brand-muted cursor-pointer">Cancel</button>
          </>
        ) : (
          <>
            <span className="text-base font-bold text-brand-ink">{page.name}</span>
            {page.url && <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-brand-blue no-underline">{page.url}</a>}
            {!readonly && (
              <button onClick={() => setEditing(true)} className="bg-transparent border border-brand-border rounded-md px-3 py-[5px] text-xs text-brand-muted cursor-pointer">✎ Edit</button>
            )}
          </>
        )}
      </div>
      <AnnotatedScreenshot page={page} onUpdate={onUpdate} password={password} readonly={readonly} highlightedAnnotationId={highlightedAnnotationId} onSelectAnnotation={onSelectAnnotation} dataSources={dataSources} jiraConfigured={jiraConfigured} onPushToJira={onPushToJira} />
    </div>
  );
}
