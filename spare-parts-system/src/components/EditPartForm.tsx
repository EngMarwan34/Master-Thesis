"use client";

import { useState, useTransition } from "react";
import type { PartRequest } from "@/lib/types";

/**
 * Inline view/edit toggle for one part line (code, name, quantity, notes).
 * In view mode it shows the part heading plus an Edit button; editing swaps
 * in a compact form that saves through the bound server action.
 */
export default function EditPartForm({
  part,
  action,
  children,
  actions,
}: {
  part: PartRequest;
  action: (formData: FormData) => Promise<void>;
  /** The read-only heading rendered in view mode (summary line, badges). */
  children: React.ReactNode;
  /** Extra controls (e.g. a delete button) shown beside Edit in view mode. */
  actions?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">{children}</div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing(true);
            }}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Edit
          </button>
          {actions}
        </div>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          try {
            await action(formData);
            setEditing(false);
            setError(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save changes");
          }
        })
      }
      className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3 sm:grid-cols-4"
    >
      <label className="text-xs text-slate-600">
        Part code *
        <input
          name="part_code"
          required
          defaultValue={part.part_code}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
        />
      </label>
      <label className="text-xs text-slate-600">
        Part name
        <input
          name="part_name"
          defaultValue={part.part_name ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
        />
      </label>
      <label className="text-xs text-slate-600">
        Quantity needed *
        <input
          type="number"
          min={1}
          name="quantity_needed"
          required
          defaultValue={part.quantity_needed}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
        />
      </label>
      <label className="text-xs text-slate-600">
        Notes
        <input
          name="notes"
          defaultValue={part.notes ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
        />
      </label>
      {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
      <div className="flex gap-2 sm:col-span-4">
        <button
          disabled={isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
