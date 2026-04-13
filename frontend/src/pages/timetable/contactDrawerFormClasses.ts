export const inputClass =
  'mt-2 h-10 w-full rounded-xl border border-slate-200/90 bg-white/95 px-3.5 text-[14px] leading-snug text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-sky-400/80 focus:outline-none focus:ring-4 focus:ring-sky-100/70';

export const textareaClass =
  'mt-2 w-full rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 text-[14px] leading-relaxed text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-sky-400/80 focus:outline-none focus:ring-4 focus:ring-sky-100/70 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

export const labelClass = 'block text-sm font-medium text-slate-600';

export const overviewLabelClass =
  'text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500';

export const overviewInputClass =
  'min-h-[42px] w-full rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-[13px] text-slate-800 shadow-sm shadow-slate-900/[0.03] outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-400/80 focus:shadow-md focus:shadow-sky-900/[0.06] focus:ring-2 focus:ring-sky-500/20 sm:min-h-[2.6rem] sm:px-3.5';

export const overviewNotesTextareaClass =
  'min-h-[5.25rem] w-full resize-none rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-800 shadow-sm shadow-slate-900/[0.03] outline-none transition placeholder:text-slate-400 focus:border-sky-400/80 focus:ring-2 focus:ring-sky-500/20 sm:min-h-[6rem] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

export const overviewFieldClass = 'flex flex-col gap-2';

export const overviewAddBtnClass =
  'rounded-xl border border-blue-200/60 bg-gradient-to-r from-white to-blue-50/50 px-3 py-1.5 text-xs font-semibold text-blue-950 shadow-sm shadow-blue-900/[0.06] transition hover:border-blue-300/80 hover:from-blue-50/80 hover:shadow-md active:scale-[0.98]';

/** Match `NewCustomerModal` contact column — `labelClass` / `inputClass` / add button / section title. */
export const customerModalKontaktLabelClass =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600';

export const customerModalKontaktInputClass =
  'min-h-[44px] w-full rounded border border-neutral-300 bg-white px-3 text-sm leading-normal text-slate-800 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 sm:h-9 sm:min-h-0';

/** Match `NewCustomerModal` kontakt role `<select>`. */
export const customerModalKontaktSelectClass =
  'h-9 w-full rounded border border-neutral-300 bg-white px-2.5 text-sm text-slate-700 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600';

export const customerModalKontaktNewBtnClass =
  'flex w-full shrink-0 items-center justify-center gap-1 rounded border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-neutral-50 sm:w-auto';

export const customerModalKundeSectionTitleClass =
  'text-sm font-bold uppercase tracking-[0.08em] text-slate-600';

export const headerCodesInputClass =
  'min-h-7 min-w-0 border-0 bg-transparent py-0 text-xs font-semibold text-white outline-none ring-0 placeholder:text-slate-500 focus:ring-0 sm:text-[13px]';

/** Vertical scroll without visible scrollbar (wheel / trackpad / touch still scroll). */
export const scrollbarHiddenY =
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0';
