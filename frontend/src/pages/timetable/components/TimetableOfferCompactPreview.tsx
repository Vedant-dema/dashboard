type Props = {
  t: (key: string, fallback: string) => string
}

/** Demo / placeholder tab body for the contact drawer “Pro Test” offer preview. */
export function TimetableOfferCompactPreview({ t }: Props) {
  return (
    <section
      id="tt-drawer-panel-offer-compact-preview"
      role="tabpanel"
      aria-labelledby="tt-drawer-tab-offer-compact-preview"
      className="customers-modal-genz-kunde-col flex min-w-0 flex-col gap-3 border border-slate-200/60 bg-white/90 p-5 shadow-sm sm:p-6"
    >
      <p className="text-sm text-slate-600">
        {t('timetableOfferCompactPreviewTab', 'Pro Test')} - {t('timetableContactAiOfferGeneric', 'Details on file')}
      </p>
    </section>
  )
}
