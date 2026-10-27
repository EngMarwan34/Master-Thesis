"use client";

import { useState, useTransition } from "react";
import type { MaintenanceRequest } from "@/lib/types";

/**
 * View/edit toggle for a maintenance request's header fields. Stays in view
 * mode until "Edit" is pressed, then shows an inline form; saving flips back
 * to view mode once the server action resolves, or surfaces its error.
 */
export default function EditRequestForm({
  request,
  action,
}: {
  request: MaintenanceRequest;
  action: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Maintenance Request {request.request_number}
          </h1>
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
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {request.customer_name ?? "No customer name"} ·{" "}
          {request.machine_name ?? "No machine specified"}
        </p>
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
      className="grid w-full gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:grid-cols-2"
    >
      <label className="text-sm text-slate-600">
        Request number *
        <input
          name="request_number"
          required
          defaultValue={request.request_number}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
      </label>
      <label className="text-sm text-slate-600">
        Customer name
        <input
          name="customer_name"
          defaultValue={request.customer_name ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
      </label>
      <label className="text-sm text-slate-600">
        Machine / equipment
        <input
          name="machine_name"
          defaultValue={request.machine_name ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
      </label>
      <label className="text-sm text-slate-600">
        Notes
        <input
          name="notes"
          defaultValue={request.notes ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
      </label>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
