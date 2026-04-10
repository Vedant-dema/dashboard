import { useEffect, useState } from 'react';
import { Truck, X } from 'lucide-react';
import type { TimetableEntry, TimetableOfferInput } from '../../types/timetable';

type Props = {
  entry: TimetableEntry | null;
  t: (key: string, fallback: string) => string;
  onClose: () => void;
  onSave: (payload: TimetableOfferInput) => void;
};

type OfferFormState = {
  vehicle_type: string;
  brand: string;
  model: string;
  year: string;
  mileage_km: string;
  quantity: string;
  expected_price_eur: string;
  location: string;
  notes: string;
};

function initialState(): OfferFormState {
  return {
    vehicle_type: '',
    brand: '',
    model: '',
    year: '',
    mileage_km: '',
    quantity: '',
    expected_price_eur: '',
    location: '',
    notes: '',
  };
}

function toNumberOrNull(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function TimetableOfferModal({ entry, t, onClose, onSave }: Props) {
  const [form, setForm] = useState<OfferFormState>(() => initialState());

  useEffect(() => {
    if (!entry) return;
    setForm({
      vehicle_type: entry.offer?.vehicle_type ?? '',
      brand: entry.offer?.brand ?? '',
      model: entry.offer?.model ?? '',
      year: entry.offer?.year != null ? String(entry.offer.year) : '',
      mileage_km: entry.offer?.mileage_km != null ? String(entry.offer.mileage_km) : '',
      quantity: entry.offer?.quantity != null ? String(entry.offer.quantity) : '',
      expected_price_eur:
        entry.offer?.expected_price_eur != null ? String(entry.offer.expected_price_eur) : '',
      location: entry.offer?.location ?? '',
      notes: entry.offer?.notes ?? '',
    });
  }, [entry]);

  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-[115] flex items-end justify-center bg-slate-950/65 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="timetable-offer-title"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl shadow-amber-900/30">
        <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h3 id="timetable-offer-title" className="text-base font-semibold text-slate-900">
                {t('timetableOfferTitle', 'Truck offer details')}
              </h3>
              <p className="text-sm text-slate-600">{entry.company_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-100 hover:text-slate-900"
            aria-label={t('commonClose', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferVehicleType', 'Vehicle type')}
            <input
              value={form.vehicle_type}
              onChange={(e) => setForm((prev) => ({ ...prev, vehicle_type: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferBrand', 'Brand')}
            <input
              value={form.brand}
              onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferModel', 'Model')}
            <input
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferLocation', 'Location')}
            <input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferYear', 'Year')}
            <input
              value={form.year}
              onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferMileage', 'Mileage (km)')}
            <input
              value={form.mileage_km}
              onChange={(e) => setForm((prev) => ({ ...prev, mileage_km: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferQuantity', 'Quantity')}
            <input
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferExpectedPrice', 'Expected price (EUR)')}
            <input
              value={form.expected_price_eur}
              onChange={(e) => setForm((prev) => ({ ...prev, expected_price_eur: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            {t('timetableOfferNotes', 'Offer notes')}
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-amber-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('commonCancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                vehicle_type: form.vehicle_type.trim(),
                brand: form.brand.trim(),
                model: form.model.trim(),
                year: toNumberOrNull(form.year),
                mileage_km: toNumberOrNull(form.mileage_km),
                quantity: toNumberOrNull(form.quantity),
                expected_price_eur: toNumberOrNull(form.expected_price_eur),
                location: form.location.trim(),
                notes: form.notes.trim(),
              })
            }
            className="h-11 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            {t('commonSave', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
