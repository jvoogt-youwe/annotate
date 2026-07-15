import { useState } from "react";
import { LBL_CLASS, generateSharePassword } from "../../lib/theme";

// ─── SHARE LINK MODAL ──────────────────────────────────────────────────────────
// Lets an internal user copy the client-facing share link and, optionally,
// protect it with a password (generated for them, or typed in by hand).
export function ShareLinkModal({ shareUrl, sharePassword, readonly, onClose, onSave }: {
  shareUrl: string;
  sharePassword: string | undefined;
  readonly: boolean;
  onClose: () => void;
  onSave: (password: string | undefined) => Promise<void>;
}) {
  const [pw, setPw] = useState(sharePassword || "");
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pwCopied, setPwCopied] = useState(false);

  const isProtected = !!sharePassword;

  function copy(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  async function save(nextPw: string | undefined) {
    setSaving(true);
    try {
      await onSave(nextPw);
      setPw(nextPw || "");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full bg-brand-off-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2.5 text-[13px] font-[Arial,sans-serif] text-[#151515] outline-none box-border";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45" onClick={onClose}>
      <div className="bg-brand-white rounded-xl w-[440px] max-h-[85vh] overflow-y-auto p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col gap-[18px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-brand-ink">Share link</p>
          <button onClick={onClose} className="bg-transparent border-none text-[22px] leading-none px-1.5 py-0.5 text-[#767676] cursor-pointer">×</button>
        </div>

        <div className="flex flex-col gap-2">
          <label className={`${LBL_CLASS} mb-0`}>Link</label>
          <div className="flex gap-2">
            <input readOnly value={shareUrl} className={`${fieldClass} flex-1`} onFocus={e => e.target.select()} />
            <button onClick={() => copy(shareUrl, setLinkCopied)}
              className="shrink-0 bg-brand-ink text-brand-white border-none rounded-lg px-3.5 py-2 text-[13px] font-bold cursor-pointer">
              {linkCopied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {!readonly && (
          <div className="flex flex-col gap-3 border-t border-brand-border pt-[18px]">
            <div className="flex items-center justify-between">
              <label className={`${LBL_CLASS} mb-0`}>Password protection</label>
              <span className="text-xs font-bold" style={{ color: isProtected ? "#008760" : "#9a9a9a" }}>
                {isProtected ? "● Protected" : "Open link"}
              </span>
            </div>
            <p className="text-xs text-brand-muted -mt-1.5 leading-normal">
              {isProtected
                ? "Anyone with the link also needs this password to open the report. Share it with your client through a separate channel (e.g. email or Slack)."
                : "Anyone with this link can currently open the report without a password."}
            </p>

            {isProtected ? (
              <>
                <div className="flex gap-2">
                  <input readOnly value={pw} className={`${fieldClass} flex-1`} onFocus={e => e.target.select()} />
                  <button onClick={() => copy(pw, setPwCopied)}
                    className="shrink-0 bg-brand-off-white text-brand-ink border-[1.5px] border-brand-border rounded-lg px-3.5 py-2 text-[13px] font-bold cursor-pointer">
                    {pwCopied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex justify-between gap-2.5">
                  <button onClick={() => save(undefined)} disabled={saving}
                    className="bg-brand-off-white text-brand-red border-[1.5px] border-brand-border rounded-lg px-3.5 py-2 text-[13px] font-bold cursor-pointer">
                    Remove protection
                  </button>
                  <button onClick={() => save(generateSharePassword())} disabled={saving}
                    className="bg-brand-ink text-brand-white border-none rounded-lg px-[18px] py-2 text-[13px] font-bold"
                    style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving…" : "Regenerate"}
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => save(generateSharePassword())} disabled={saving}
                className="bg-brand-ink text-brand-white border-none rounded-lg px-[18px] py-2.5 text-[13px] font-bold"
                style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Generating…" : "Generate a password"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
