import { useAppState } from './store'
import { viewerOf } from './viewer'
import { CURRENCY } from './defaults'
import type { Lang, Org } from './types'

const LOCALE: Record<Lang, string> = { en: 'en-GB', ta: 'ta-LK' }

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function makeFmt(org: Org | null, lang: Lang) {
  const numLocale = org?.numberFormat === 'indian' ? 'en-IN' : 'en-US'
  const nf = new Intl.NumberFormat(numLocale, { maximumFractionDigits: 0 })
  const sym = CURRENCY.symbol
  const n = (x: number) => nf.format(Math.round(x))
  const dayMonth = new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short' })
  const monthYear = new Intl.DateTimeFormat(LOCALE[lang], { month: 'long', year: 'numeric' })
  return {
    sym,
    n,
    cur: (x: number) => `${sym} ${n(x)}`,
    signed: (x: number) => `${x >= 0 ? '+' : '−'} ${sym} ${n(Math.abs(x))}`,
    dec: (x: number, d: number) =>
      new Intl.NumberFormat(numLocale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(x),
    /** "16–19 Nov" in the viewer's language */
    range: (start: string, end: string | null) =>
      !end || end === start ? dayMonth.format(toDate(start)) : dayMonth.formatRange(toDate(start), toDate(end)),
    month: (key: string) => monthYear.format(toDate(key + '-01')),
  }
}

export type Fmt = ReturnType<typeof makeFmt>

export function useFmt(): Fmt {
  const s = useAppState()
  return makeFmt(s.org, viewerOf(s).lang)
}
