import { useState } from "react";

// ─── REVEAL PASSWORD MODAL ────────────────────────────────────────────────────
// Shows a freshly generated/reset password once — used by client creation and
// password reset flows, since passwords are hashed and can't be retrieved later.
export function RevealPasswordModal({
  clientName, password, onClose,
}: {
  clientName: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(password).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45">
      <div className="bg-brand-white rounded-xl w-[420px] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col gap-[18px]">
        <p className="text-[15px] font-bold text-brand-ink">Password for {clientName}</p>
        <p className="text-xs text-brand-muted -mt-2.5">
          Save this now and share it with the client — it won't be shown again.
        </p>
        <div className="flex items-center gap-2 bg-brand-off-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2.5">
          <code className="flex-1 text-[13px] font-mono text-brand-ink break-all">{password}</code>
          <button onClick={copy} className="bg-brand-ink text-brand-white border-none rounded-md px-2.5 py-1.5 text-xs font-bold shrink-0" style={{ cursor: "pointer" }}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="bg-brand-red text-brand-white border-none rounded-lg px-[18px] py-[9px] text-[13px] font-bold" style={{ cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
