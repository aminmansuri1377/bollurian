"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { CloseIcon } from "./icons";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ open, title, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      aria-label={title}
      className="fixed inset-0 m-auto max-h-[86vh] w-[1040px] max-w-none overflow-hidden rounded-[24px] border border-outline bg-white p-0 text-brand shadow-2xl backdrop:bg-brand/40 print:hidden"
    >
      <header className="flex items-center justify-between border-b border-outline/30 px-7 py-5">
        <h2 className="text-xl font-bold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="بستن پنجره" className="cursor-pointer rounded-full p-2 outline-none hover:bg-lavender/50 focus-visible:ring-2 focus-visible:ring-brand">
          <CloseIcon className="size-5" />
        </button>
      </header>
      <div className="max-h-[calc(86vh-85px)] overflow-auto p-7">{children}</div>
    </dialog>
  );
}