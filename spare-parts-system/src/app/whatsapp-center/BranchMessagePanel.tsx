"use client";

import { useMemo, useState, useTransition } from "react";
import { buildWhatsAppLink, buildWhatsAppMessage } from "@/lib/whatsapp";
import { BRANCH_LABELS, type Branch } from "@/lib/types";
import type { SourcingWithContext } from "@/lib/repo";
import { markMessageSent } from "@/lib/actions";

interface Props {
  branch: Branch;
  lines: SourcingWithContext[];
  contactName: string | null;
  phoneNumber: string | null;
}

export default function BranchMessagePanel({ branch, lines, contactName, phoneNumber }: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(lines.map((l) => l.id)));
  const [senderName, setSenderName] = useState("");
  const [copied, setCopied] = useState(false);
  const [justMarked, setJustMarked] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedLines = lines.filter((line) => selected.has(line.id));

  const message = useMemo(() => {
    if (selectedLines.length === 0) return "";
    return buildWhatsAppMessage(
      branch,
      selectedLines.map((line) => ({
        request_number: line.request_number,
        part_code: line.part_code,
        part_name: line.part_name,
        quantity: line.quantity,
        source_type: line.source_type,
      })),
      senderName || undefined,
    );
  }, [branch, selectedLines, senderName]);

  function toggle(id: number) {
    setJustMarked(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable (e.g. insecure context) — the
      // message is still visible in the textarea for manual copying.
    }
  }

  function handleMarkSent() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      await markMessageSent(ids);
      setJustMarked(true);
    });
  }

  if (lines.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{BRANCH_LABELS[branch]} Branch</h3>
        {contactName || phoneNumber ? (
          <span className="text-xs text-slate-500">
            {contactName ?? ""} {phoneNumber ? `· ${phoneNumber}` : ""}
          </span>
        ) : (
          <span className="text-xs text-amber-600">
            No WhatsApp number saved for this branch — add one in Settings to open the chat directly
          </span>
        )}
      </div>

      <ul className="space-y-1.5">
        {lines.map((line) => (
          <li key={line.id} className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(line.id)}
              onChange={() => toggle(line.id)}
              className="h-4 w-4"
            />
            <span className="font-medium text-slate-800">{line.part_code}</span>
            {line.part_name && <span className="text-slate-500">– {line.part_name}</span>}
            <span className="text-slate-500">× {line.quantity}</span>
            <span className="text-slate-400">(Maintenance request {line.request_number})</span>
            {line.source_type === "stock_pull" && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800">
                Stock pull
              </span>
            )}
          </li>
        ))}
      </ul>

      <label className="mt-3 block text-xs text-slate-600">
        Requested by (shown in the message)
        <input
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="e.g. Mohammed"
          className="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </label>

      <textarea
        readOnly
        value={message}
        rows={Math.min(16, selectedLines.length * 4 + 5)}
        className="mt-3 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
        dir="ltr"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!message}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          {copied ? "Copied ✓" : "Copy Message"}
        </button>
        <a
          href={message ? buildWhatsAppLink(phoneNumber, message) : undefined}
          target="_blank"
          rel="noreferrer"
          className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
            message ? "bg-emerald-600 hover:bg-emerald-700" : "pointer-events-none bg-emerald-300"
          }`}
        >
          Open WhatsApp & Send
        </a>
        <button
          type="button"
          onClick={handleMarkSent}
          disabled={selected.size === 0 || isPending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
        >
          {isPending ? "Updating..." : "Mark as Sent"}
        </button>
      </div>
      {justMarked && (
        <p className="mt-2 text-xs text-emerald-700">
          The selected parts have been updated to &ldquo;Sent via WhatsApp&rdquo;.
        </p>
      )}
    </div>
  );
}
