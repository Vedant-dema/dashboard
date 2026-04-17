import { CarFront, RotateCcw, X } from 'lucide-react';
import type { TimetableTruckOffer } from '../../../types/timetable';
import {
  buildStripMetaLine,
  soldOfferMenuMetaLine,
  timetableOfferVehicleChipLabel,
} from './TimetableOfferVehicleStrip';

type Props = {
  open: boolean;
  onClose: () => void;
  soldOffers: TimetableTruckOffer[];
  onRestore: (id: string) => void;
  t: (key: string, fallback: string) => string;
};

export function TimetableSoldVehiclesArchiveModal({ open, onClose, soldOffers, onRestore, t }: Props) {
  if (!open) return null;

  const untitled = t('timetableOfferChipUntitled', 'Vehicle');

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={t('commonClose', 'Close')}
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tt-sold-archive-title"
        className="relative z-[121] flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/25 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-red-200/80 bg-gradient-to-r from-red-50 to-rose-50/90 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2
              id="tt-sold-archive-title"
              className="flex items-center gap-2 text-sm font-bold text-red-800 sm:text-base"
            >
              <CarFront className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
              {t('timetableOfferSoldArchiveTitle', 'Sold vehicles (third party)')}
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-red-900/75 sm:text-xs">
              {t(
                'timetableOfferSoldArchiveSubtitle',
                'These lines are removed from the active vehicle list. Restore a line to edit it again in the offer workspace.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-white/80 hover:text-slate-800"
            aria-label={t('commonClose', 'Close')}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
          {soldOffers.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {t('timetableOfferSoldArchiveEmpty', 'No sold vehicle lines for this appointment.')}
            </p>
          ) : (
            <ul className="space-y-2">
              {soldOffers.map((o) => {
                const title = timetableOfferVehicleChipLabel(o, untitled);
                const detail = buildStripMetaLine(o, t);
                const prices = soldOfferMenuMetaLine(o, t);
                return (
                  <li
                    key={o.id}
                    className="rounded-xl border border-slate-200/85 bg-slate-50/80 p-3 shadow-sm ring-1 ring-slate-900/[0.03] sm:p-3.5"
                  >
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="flex min-w-0 flex-1 gap-2.5">
                        <span
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-800"
                          aria-hidden
                        >
                          <CarFront className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-serif text-sm font-semibold leading-snug text-slate-900">{title}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-600 sm:text-xs">{detail}</p>
                          {prices ? (
                            <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-700 sm:text-xs">
                              {prices}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              t('timetableOfferSoldRestoreConfirm', 'Return this vehicle line to the active list?'),
                            )
                          ) {
                            onRestore(o.id);
                          }
                        }}
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-200/90 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:min-h-0 sm:w-auto sm:px-3.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                        {t('timetableOfferSoldRestore', 'Take back')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
