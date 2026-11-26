import { useAppState } from '../store'
import { tripTotals } from '../calc'
import { APP_NAME } from '../defaults'
import { useFmt, type Fmt } from '../format'
import { categoryLabel, useT, type T } from '../i18n'
import type { AppState, Trip } from '../types'
import { canViewTrip, useViewer } from '../viewer'
import { Icon, NotFound, TopBar } from '../ui'

const sectionHead = { fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--muted)' }
const block = { padding: '16px 18px', borderBottom: '1px solid var(--line-soft)' }

export function TripSummary({ tripId }: { tripId: string }) {
  const s = useAppState()
  const v = useViewer()
  const { t } = useT()
  const f = useFmt()
  const trip = s.trips.find((x) => x.id === tripId)
  if (!trip || !canViewTrip(v, trip) || !v.seeMoney) return <NotFound />
  const vehicle = s.vehicles.find((x) => x.id === trip.vehicleId) ?? null
  const x = tripTotals(trip)
  const end = trip.endDate ?? trip.startDate
  const extras = s.vehicleExpenses.filter((e) => e.vehicleId === trip.vehicleId && e.date >= trip.startDate && e.date <= end)
  const expenses = [...trip.expenses].sort((a, b) => b.amount - a.amount)
  const catName = (id: string) => {
    const c = s.categories.find((k) => k.id === id)
    return c ? categoryLabel(c, t, vehicle) : ''
  }
  const fuelName = vehicle ? t(`fuel.${vehicle.fuel}`) : t('cat.fuel')

  const share = async () => {
    const text = shareText(s, trip, t, f, catName)
    if (navigator.share) {
      try { await navigator.share({ text }); return } catch { /* cancelled or unsupported: fall back */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  return (
    <div className="screen" style={{ gap: 16 }}>
      <TopBar back={{ name: 'trip', tripId }} backLabel={t('sum.back')} title={t('sum.title')} />

      <article className="card print-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 18 }}>
        <header style={{ background: 'var(--ink)', color: '#fff', padding: '16px 18px' }} className="between">
          <div className="stack" style={{ gap: 2 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800 }}>{s.org?.name}</span>
            <span style={{ fontSize: 13, color: 'var(--muted-on-dark)' }}>{vehicle?.regNo} · {f.range(trip.startDate, trip.endDate)} {trip.startDate.slice(0, 4)}</span>
          </div>
          <span className="chip accent" style={{ fontWeight: 700, padding: '4px 10px', borderRadius: 10 }}>{trip.status === 'closed' ? t('common.closed') : t('common.open')}</span>
        </header>

        <div className="stack" style={{ ...block, gap: 8 }}>
          <span style={sectionHead}>{t('common.income')}</span>
          {trip.legs.map((l) => (
            <div key={l.id} className="between" style={{ alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14 }} className={l.empty ? 'amber' : ''}>
                {l.from} → {l.to} · {l.empty ? t('sum.empty') : l.cargo || '—'}
                {!l.empty && l.client && <><br /><span className="label">{l.client}</span></>}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700 }} className={l.empty ? 'label' : ''}>{l.empty ? '—' : f.n(l.income)}</span>
            </div>
          ))}
          <div className="between" style={{ borderTop: '1px dashed var(--line)', paddingTop: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t('sum.totalIncome')}</span>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{f.n(x.income)}</span>
          </div>
        </div>

        <div className="stack" style={{ ...block, gap: 6 }}>
          <span style={sectionHead}>{t('common.expenses')}</span>
          {expenses.map((e) => (
            <div key={e.id} className="between">
              <span style={{ fontSize: 14 }}>{catName(e.categoryId)}{e.note ? ` (${e.note})` : ''}</span>
              <span style={{ fontSize: 14 }}>{f.n(e.amount)}</span>
            </div>
          ))}
          <div className="between" style={{ borderTop: '1px dashed var(--line)', paddingTop: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t('sum.totalExpenses')}</span>
            <span style={{ fontSize: 15, fontWeight: 800 }} className="red">{f.n(x.expenses)}</span>
          </div>
        </div>

        <div className="between baseline" style={{ padding: '16px 18px', background: 'var(--amber-bg)' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{t('common.profit')}</span>
          <span style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 800 }} className={x.profit >= 0 ? 'green' : 'red'}>{f.cur(x.profit)}</span>
        </div>

        <div className="grid2" style={{ padding: '16px 18px' }}>
          <div className="stat"><span className="label">{t('sum.distance')}</span><span className="strong">{trip.distanceKm ? `${f.n(trip.distanceKm)} km` : '—'}</span></div>
          <div className="stat"><span className="label">{t('sum.fuelUsed', { fuel: fuelName })}</span><span className="strong">{x.litres ? `${f.dec(x.litres, 3)} L` : '—'}</span></div>
          <div className="stat"><span className="label">{t('sum.fuelPrice', { fuel: fuelName })}</span><span className="strong">{x.litres ? `${f.sym} ${f.dec(x.fuelCost / x.litres, 2)} / L` : '—'}</span></div>
          <div className="stat"><span className="label">{t('sum.mileage')}</span><span className="strong">{x.mileage ? `${f.dec(x.mileage, 2)} km/L` : '—'}</span></div>
        </div>
        <div className="label" style={{ padding: '0 18px 12px', textAlign: 'right' }}>{t('sum.madeWith', { app: APP_NAME })}</div>
      </article>

      {extras.map((e) => (
        <div key={e.id} className="card between" style={{ borderRadius: 14, padding: '12px 16px' }}>
          <div className="stack" style={{ gap: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{t('sum.vehicleExtra')}</span>
            <span className="label">{e.description}</span>
          </div>
          <span className="strong">{f.n(e.amount)}</span>
        </div>
      ))}

      <button className="btn big primary no-print" onClick={share}><Icon.Share /> {t('sum.share')}</button>
      <button className="btn big no-print" style={{ height: 52, fontWeight: 600, fontSize: 15 }} onClick={() => window.print()}>{t('sum.pdf')}</button>
    </div>
  )
}

function shareText(s: AppState, trip: Trip, t: T, f: Fmt, catName: (id: string) => string): string {
  const x = tripTotals(trip)
  const vehicle = s.vehicles.find((v) => v.id === trip.vehicleId)
  const lines = [
    `*${s.org?.name ?? ''}* · ${vehicle?.regNo ?? ''}`,
    t('trip.title', { dates: `${f.range(trip.startDate, trip.endDate)} ${trip.startDate.slice(0, 4)}` }),
    '',
    `*${t('common.income')}*`,
    ...trip.legs.map((l) => `${l.from} → ${l.to}${l.empty ? ` (${t('sum.empty')})` : l.cargo ? ` · ${l.cargo}` : ''}: ${l.empty ? '—' : f.n(l.income)}`),
    `${t('sum.totalIncome')}: ${f.cur(x.income)}`,
    '',
    `*${t('common.expenses')}*`,
    ...[...trip.expenses].sort((a, b) => b.amount - a.amount).map((e) => `${catName(e.categoryId)}${e.note ? ` (${e.note})` : ''}: ${f.n(e.amount)}`),
    `${t('sum.totalExpenses')}: ${f.cur(x.expenses)}`,
    '',
    `*${t('common.profit')}: ${f.cur(x.profit)}*`,
  ]
  if (trip.distanceKm) lines.push(`${f.n(trip.distanceKm)} km${x.mileage ? ` · ${f.dec(x.mileage, 2)} km/L` : ''}`)
  lines.push('', `_${t('sum.madeWith', { app: APP_NAME })}_`)
  return lines.join('\n')
}
