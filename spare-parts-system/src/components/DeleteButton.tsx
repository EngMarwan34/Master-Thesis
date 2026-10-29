"use client";

import { useTransition, type ReactNode } from "react";

/**
 * Submits a bound server action after a confirm() prompt. Used for the
 * destructive delete controls across the app so a misclick can't silently
 * wipe a request, part, or sourcing line.
 */
export default function DeleteButton({
  action,
  confirmMessage,
  children,
  className,
  title,
}: {
  action: () => void | Promise<void>;
  confirmMessage: string;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title={title}
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(() => action());
      }}
      className={className}
    >
      {isPending ? "…" : children}
    </button>
  );
}
