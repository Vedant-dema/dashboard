import { describe, expect, it } from 'vitest'
import { parseOfferFreeText } from './timetableOfferFreeTextParse'

describe('parseOfferFreeText', () => {
  it('extracts seller and purchasing prices from multi-vehicle negotiation text', () => {
    const input = [
      'Wir hatten 3 Fahrzeuge abzugeben:',
      '- 2x DAF XF 480, Baujahr 2020, je ca. 430000 km',
      '- 1x DAF XF 480, Baujahr 2019, 610000 km',
      'Standort: Dortmund',
      'Preisidee Verkaufer: 31.000 EUR pro Stuck (2020), 24.000 EUR (2019)',
      'DEMA Einkauf: 27.000 / 21.000',
    ].join('\n')

    const parsed = parseOfferFreeText(input)

    expect(parsed.offerPatch.brand).toBe('DAF')
    expect(parsed.offerPatch.model).toBe('XF 480')
    expect(parsed.offerPatch.year).toBe(2020)
    expect(parsed.offerPatch.mileage_km).toBe(430000)
    expect(parsed.offerPatch.quantity).toBe(2)
    expect(parsed.offerPatch.expected_price_eur).toBe(31000)
    expect(parsed.offerPatch.purchase_bid_eur).toBe(27000)
    expect(parsed.offerPatch.location).toBe('Dortmund')
    expect(parsed.offerPatch.notes).toBeUndefined()
  })

  it('keeps notes focused on equipment keywords only', () => {
    const input = [
      'MAN TGX 18.500, Baujahr 2020, 520000 km',
      'Ausstattung: Retarder, Klima, Standheizung',
      'Verkauferpreis: 28.500 EUR',
      'DEMA Einkaufspreis: 24.000 EUR',
    ].join('\n')

    const parsed = parseOfferFreeText(input)

    expect(parsed.offerPatch.expected_price_eur).toBe(28500)
    expect(parsed.offerPatch.purchase_bid_eur).toBe(24000)
    expect(parsed.offerPatch.notes).toContain('Retarder')
    expect(parsed.offerPatch.notes).toContain('Klima')
    expect(parsed.offerPatch.notes).toContain('Standheizung')
  })
})

