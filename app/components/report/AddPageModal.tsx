import { LBL_CLASS } from "../../lib/theme";
import type { Device } from "../../lib/types";

export interface NewPageForm {
  name: string;
  url: string;
  devices: Device[];
}

// ─── ADD PAGE MODAL ───────────────────────────────────────────────────────────
export function AddPageModal({
  newPageForm, setNewPageForm, capturing, captureError, onClose, onCapture, onAddWithoutCapture,
}: {
  newPageForm: NewPageForm;
  setNewPageForm: React.Dispatch<React.SetStateAction<NewPageForm>>;
  capturing: boolean;
  captureError: string;
  onClose: () => void;
  onCapture: () => void;
  onAddWithoutCapture: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45"
      onClick={() => !capturing && onClose()}>
      <div className="bg-brand-white rounded-xl w-[420px] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col gap-[18px]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-brand-ink">Add new page</p>
          <button onClick={() => !capturing && onClose()} disabled={capturing}
            className="bg-transparent border-none text-[22px] leading-none px-1.5 py-0.5"
            style={{ color: capturing ? "#ccc" : "#9a9a9a", cursor: capturing ? "not-allowed" : "pointer" }}>×</button>
        </div>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className={LBL_CLASS}>Page name</label>
            <input autoFocus value={newPageForm.name} onChange={e => setNewPageForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Checkout step 2"
              className="w-full bg-brand-off-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2.5 text-[13px] font-[Arial,sans-serif] text-[#151515] outline-none box-border" />
          </div>
          <div>
            <label className={LBL_CLASS}>Page URL</label>
            <input value={newPageForm.url} onChange={e => setNewPageForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com/checkout"
              className="w-full bg-brand-off-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2.5 text-[13px] font-[Arial,sans-serif] text-[#151515] outline-none box-border" />
          </div>
          <div>
            <label className={LBL_CLASS}>Device type</label>
            <div className="flex gap-4">
              {(["desktop", "mobile"] as const).map(d => (
                <label key={d} className="flex items-center gap-1.5 text-[13px] font-[Arial,sans-serif] text-[#151515] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPageForm.devices.includes(d)}
                    onChange={e => setNewPageForm(f => ({
                      ...f,
                      devices: e.target.checked ? [...f.devices, d] : f.devices.filter(x => x !== d),
                    }))}
                    className="accent-brand-red"
                  />
                  {d === "desktop" ? "Desktop" : "Mobile"}
                </label>
              ))}
            </div>
          </div>
        </div>
        {captureError && <p className="text-xs text-brand-red m-0">{captureError}</p>}
        <div className="flex gap-2.5 justify-end mt-1 flex-wrap">
          <button onClick={onCapture} disabled={capturing || !newPageForm.name.trim() || !newPageForm.url.trim() || newPageForm.devices.length === 0}
            title={!newPageForm.url.trim() ? "Enter a page URL to capture a screenshot" : undefined}
            className="bg-brand-ink text-brand-white border-none rounded-lg px-[18px] py-[9px] text-[13px] font-bold"
            style={{
              cursor: (capturing || !newPageForm.name.trim() || !newPageForm.url.trim() || newPageForm.devices.length === 0) ? "not-allowed" : "pointer",
              opacity: (!newPageForm.name.trim() || !newPageForm.url.trim() || newPageForm.devices.length === 0) ? 0.5 : 1,
            }}>
            {capturing ? "Capturing…" : "Capture & Add Page"}
          </button>
          <button onClick={onAddWithoutCapture} disabled={!newPageForm.name.trim() || newPageForm.devices.length === 0 || capturing}
            className="bg-brand-red text-brand-white border-none rounded-lg px-[18px] py-[9px] text-[13px] font-bold"
            style={{
              cursor: (newPageForm.name.trim() && newPageForm.devices.length > 0 && !capturing) ? "pointer" : "not-allowed",
              opacity: (newPageForm.name.trim() && newPageForm.devices.length > 0) ? 1 : 0.5,
            }}>
            Add page
          </button>
        </div>
      </div>
    </div>
  );
}
