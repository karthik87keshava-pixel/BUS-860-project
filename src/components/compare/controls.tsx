"use client";
// Small form controls used across the compare page.
import { useEffect, useId, useRef, useState } from "react";

/** A number the user can edit, shown pre-filled, with a "reset" link once changed. */
export function NumberField({
  value,
  onChange,
  onReset,
  changed,
  prefix,
  suffix,
  step = 1,
  min,
  max,
  label,
  percent = false,
  decimals = 0,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  onReset?: () => void;
  changed?: boolean;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  label: string; // for screen readers
  percent?: boolean; // value is a fraction; shown ×100
  decimals?: number;
  className?: string;
}) {
  const shownNum = percent ? round(value * 100, decimals) : round(value, decimals);
  // Money with cents shows two decimals ("1.80"), other numbers as short as possible
  const shown = decimals >= 2 && !percent && Number.isInteger(round(shownNum * 100, 6)) ? shownNum.toFixed(2) : String(shownNum);
  const [text, setText] = useState(shown);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(shown);
  }, [shown]);

  const commit = (t: string) => {
    const n = Number(t.replace(/[,$\s]/g, ""));
    if (t.trim() === "" || !Number.isFinite(n)) {
      setText(shown);
      return;
    }
    let v = percent ? n / 100 : n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(v);
  };

  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <span
        className={`inline-flex items-baseline rounded-md border px-2 py-1 focus-within:border-accent ${changed ? "border-accent bg-accent-soft" : "border-line hover:border-muted"}`}
      >
        {prefix && <span className="mr-0.5 text-muted">{prefix}</span>}
        <input
          aria-label={label}
          inputMode="decimal"
          className="w-full min-w-0 bg-transparent text-right outline-none"
          style={{ width: `${Math.max(3, text.length + 1)}ch` }}
          value={text}
          step={step}
          onFocus={(e) => {
            focused.current = true;
            e.target.select(); // typing replaces the old number
          }}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => {
            focused.current = false;
            commit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        {suffix && <span className="ml-0.5 text-muted">{suffix}</span>}
      </span>
      {changed && onReset && (
        <button type="button" onClick={onReset} className="mt-0.5 text-xs text-accent underline">
          reset to default
        </button>
      )}
    </span>
  );
}

function round(n: number, d: number) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

/** "i" button that shows where a default came from. */
export function InfoTip({ children, label = "Where this number comes from" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted text-[10px] leading-none text-muted hover:border-accent hover:text-accent"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-6 z-40 block w-72 rounded-lg border border-line bg-white p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-fg shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-accent" : "bg-zinc-300"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <span>{label}</span>
    </label>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
