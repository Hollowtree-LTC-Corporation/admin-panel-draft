import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

function initialFor(name: string): string {
  const trimmed = (name || "").trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
}

type Size = "sm" | "lg";

function sizeClasses(size: Size) {
  if (size === "lg") {
    return {
      box: "h-12 w-12 rounded-lg",
      text: "text-lg",
    };
  }
  return {
    box: "h-8 w-8 rounded-md",
    text: "text-sm",
  };
}

/** Read-only org logo (list + display contexts). 32px by default, 48px when size="lg". */
export function OrgLogo({
  name,
  logoUrl,
  size = "sm",
}: {
  name: string;
  logoUrl: string | null | undefined;
  size?: Size;
}) {
  const [errored, setErrored] = useState(false);
  useEffect(() => { setErrored(false); }, [logoUrl]);
  const s = sizeClasses(size);
  const showImage = !!logoUrl && !errored;
  return showImage ? (
    <img
      src={logoUrl!}
      alt={name}
      onError={() => setErrored(true)}
      className={`${s.box} object-contain bg-white border border-black/10 shrink-0`}
    />
  ) : (
    <div
      aria-label={name}
      className={`${s.box} bg-slate-200 text-slate-600 font-medium ${s.text} flex items-center justify-center shrink-0`}
    >
      {initialFor(name)}
    </div>
  );
}

/** Editable org logo for the detail header. Wireframe-only: persists in component state. */
export function OrgLogoEditor({
  name,
  logoUrl,
  onChange,
  disabled = false,
}: {
  name: string;
  logoUrl: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}) {
  const [current, setCurrent] = useState<string | null>(logoUrl);
  const [pending, setPending] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [imgErrored, setImgErrored] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrent(logoUrl); setImgErrored(false); }, [logoUrl]);

  const displayUrl = pending?.url ?? current;
  const showImage = !!displayUrl && (pending != null || !imgErrored);

  const openPicker = () => {
    setError(null);
    fileRef.current?.click();
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File must be under 2MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setPending({ url, file });
    setError(null);
  };

  const saveLogo = () => {
    if (!pending) return;
    setCurrent(pending.url);
    onChange(pending.url);
    setPending(null);
    setImgErrored(false);
    toast.success("Logo updated");
  };

  const cancelPending = () => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
    setError(null);
  };

  const removeLogo = () => {
    setCurrent(null);
    onChange(null);
    setConfirmingRemove(false);
    setImgErrored(false);
    toast.success("Logo removed");
  };

  return (
    <div className="flex flex-col items-start gap-1 shrink-0">
      <div className="relative group">
        {showImage ? (
          <img
            src={displayUrl!}
            alt={name}
            onError={() => setImgErrored(true)}
            className="h-12 w-12 rounded-lg object-contain bg-white border border-black/10"
          />
        ) : (
          <div
            aria-label={name}
            className="h-12 w-12 rounded-lg bg-slate-200 text-slate-600 font-medium text-lg flex items-center justify-center"
          >
            {initialFor(name)}
          </div>
        )}
        {!disabled && !pending && showImage && (
          <button
            type="button"
            onClick={openPicker}
            className="absolute inset-0 rounded-lg bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium"
            title="Replace logo"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Replace</span>
          </button>
        )}
      </div>

      {!disabled && (
        <div className="text-[11px] leading-tight">
          {pending ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveLogo}
                className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-medium hover:bg-emerald-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={cancelPending}
                className="text-black/55 hover:text-black underline"
              >
                Cancel
              </button>
            </div>
          ) : !showImage ? (
            <button
              type="button"
              onClick={openPicker}
              className="text-black/60 hover:text-black underline"
            >
              Upload logo
            </button>
          ) : confirmingRemove ? (
            <div className="flex items-center gap-1.5">
              <span className="text-black/60">Remove?</span>
              <button
                type="button"
                onClick={removeLogo}
                className="text-red-600 hover:text-red-700 underline font-medium"
              >
                Remove
              </button>
              <span className="text-black/30">·</span>
              <button
                type="button"
                onClick={() => setConfirmingRemove(false)}
                className="text-black/55 hover:text-black underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              className="text-black/45 hover:text-black/80 underline"
            >
              Remove
            </button>
          )}
          {error && <div className="text-red-600 mt-0.5">{error}</div>}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={onFilePicked}
      />
    </div>
  );
}
