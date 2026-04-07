import type { ReactNode } from "react";

type Props = {
  onBackdropClick: () => void;
  children: ReactNode;
};

export function CustomerModalFrame({ onBackdropClick, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-[2px] sm:p-4 md:p-5"
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        className="relative flex w-full max-h-[88vh] max-w-[min(112rem,99vw)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-kunde-title"
      >
        {children}
      </div>
    </div>
  );
}
