import { useState, type ReactNode } from 'react'
import { actions, useAppState } from '../store'
import { legProfits, monthKey, todayISO, tripTotals } from '../calc'
import { useFmt, type Fmt } from '../format'
import { categoryLabel, useT, type T } from '../i18n'
import type { AppState, Leg, Trip } from '../types'
import { href } from '../router'
import { useViewer } from '../viewer'
import { BottomNav, NotFound } from '../ui'

type Tab = 'overview' | 'vehicles' | 'drivers' | 'customers' | 'routes' | 'fuel' | 'balances'
const TABS: Tab[] = ['overview', 'vehicles', 'drivers', 'customers', 'routes', 'fuel', 'balances']

export function Reports() {
  const s = useAppState()
  const v = useViewer()
  const { t } = useT()
  const f = useFmt()
  const months = [...new Set(s.trips.map((x) => monthKey(x.startDate)))].sort().reverse()
  const [period, setPeriod] = useState<string>(months[0] ?? monthKey(todayISO()))
  const [tab, setTab] = useState<Tab>('overview')
  if (!v.canSeeReports) return <NotFound />

  const inPeriod = (iso: string) => period === 'all' || monthKey(iso) === period
  const trips = s.trips.filter((x) => inPeriod(x.startDate))
  const extras = s.vehicleExpenses.filter((x) => inPeriod(x.date))
  const periodName = period === 'all' ? t('rep.allTime') : f.month(period)

  let body: ReactNode
  if (tab === 'balances') body = <Balances s={s} t={t} f={f} />
  else if (trips.length === 0) body = <p className="empty-state">{t('rep.noTrips', { period: periodName })}</p>
  else if (tab === 'overview') body = <Overview s={s} trips={trips} extras={extras.reduce((a, x) => a + x.amount, 0)} t={t} f={f} />
  else if (tab === 'vehicles') body = <VehiclesTab s={s} trips={trips} extras={extras} t={t} f={f} />
  else if (tab === 'drivers') body = <DriversTab s={s} trips={trips} t={t} f={f} />
  else if (tab === 'customers') body = <LegGroups trips={trips} by={(l) => l.client || '—'} t={t} f={f} />
  else if (tab === 'routes') body = <LegGroups trips={trips} by={(l) => `${l.from} → ${l.to}`} t={t} f={f} showEmpty />
  else body = <FuelTab s={s} trips={trips} t={t} f={f} />

  return (
    <>
      <div className="screen with-nav" style={{ gap: 16 }}>
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <h1 className="title-xl">{t('rep.title')}</h1>
          {tab !== 'balances' && (
            <select aria-label={t('rep.period')} className="btn pill select" style={{ height: 40, fontSize: 14, fontWeight: 600, borderRadius: 20 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
              {(months.length ? months : [period]).filter((m) => m !== 'all').map((m) => <option key={m} value={m}>{f.month(m)}</option>)}
              <option value="all">{t('rep.allTime')}</option>
            </select>
          )}
        </div>
        <div className="tabs" role="group" aria-label={t('rep.title')}>
          {TABS.map((k) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{t(`rep.${k}`)}</button>)}
        </div>
        {body}
      </div>
      <BottomNav active="reports" />
    </>
  )
}

interface P { t: T; f: Fmt }

// ---------- overview ----------
function Overview({ s, trips, extras, t, f }: P & { s: AppState; trips: Trip[]; extras: number }) {
  const totals = trips.map(tripTotals)
  const income = totals.reduce((a, x) => a + x.income, 0)
  const expenses = totals.reduce((a, x) => a + x.expenses, 0)
  const km = trips.reduce((a, x) => a + (x.distanceKm ?? 0), 0)
  // Per-km figures only use trips with km recorded.
  const kmT = trips.filter((x) => x.distanceKm).map(tripTotals)
  const perKm = (g: (x: ReturnType<typeof tripTotals>) => number) => (km ? kmT.reduce((a, x) => a + g(x), 0) / km : null)
  const litresKm = kmT.reduce((a, x) => a + x.litres, 0)
  const fuelCost = totals.reduce((a, x) => a + x.fuelCost, 0)
  const show = (n: number | null) => (n == null ? '—' : `${f.sym} ${f.dec(n, 1)}`)

  const byCat = new Map<string, number>()
  trips.forEach((x) => x.expenses.forEach((e) => byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount)))
  const groups = [...byCat].map(([id, amount]) => {
    const c = s.categories.find((k) => k.id === id)
    return { label: c ? categoryLabel(c, t) : '—', amount }
  }).sort((a, b) => b.amount - a.amount)

  const legs = trips.flatMap((x) => x.legs)
  const emptyLegs = legs.filter((l) => l.empty)

  return (
    <>
      <div className="grid2" style={{ gap: 10 }}>
        <div className="card dark stat" style={{ padding: 14 }}>
          <span className="label">{t('rep.profitKm')}</span>
          <span style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>{show(perKm((x) => x.profit))}</span>
        </div>
        <div className="card stat" style={{ padding: 14 }}>
          <span className="label">{t('trip.mileage')}</span>
          <span style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800 }}>{litresKm ? <>{f.dec(km / litresKm, 2)} <span style={{ fontSize: 14 }}>km/L</span></> : '—'}</span>
        </div>
        <div className="card stat" style={{ padding: 14 }}>
          <span className="label">{t('rep.incomeKm')}</span>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{show(perKm((x) => x.income))}</span>
        </div>
        <div className="card stat" style={{ padding: 14 }}>
          <span className="label">{t('rep.costKm')}</span>
          <span style={{ fontSize: 20, fontWeight: 800 }} className="red">{show(perKm((x) => x.expenses))}</span>
        </div>
      </div>

      <div className="card between" style={{ padding: '12px 16px' }}>
        <span className="small">{t('rep.tripsKm', { n: trips.length, km: f.n(km) })}</span>
        <span className="strong">{t('rep.net', { amount: f.cur(income - expenses - extras) })}</span>
      </div>

      {groups.length > 0 && (
        <section className="card stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t('rep.whereMoney')}</h2>
          {groups.map((g) => {
            const pct = (g.amount / expenses) * 100
            return (
              <div key={g.label} className="stack" style={{ gap: 4 }}>
                <div className="between" style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{g.label}</span>
                  <span>{f.n(g.amount)} · {f.dec(pct, 1)}%</span>
                </div>
                <div className="bar"><span style={{ width: `${pct}%` }} /></div>
              </div>
            )
          })}
          {extras > 0 && (
            <div className="between" style={{ fontSize: 13, borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
              <span style={{ fontWeight: 600 }}>{t('rep.vehicleExtras')}</span>
              <span>{f.n(extras)}</span>
            </div>
          )}
        </section>
      )}

      {emptyLegs.length > 0 && (
        <section className="card amber stack" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t('rep.emptyTitle')}</h2>
          <span style={{ fontSize: 14, lineHeight: 1.45 }}>
            {t('rep.emptyBody', { n: emptyLegs.length, total: legs.length, routes: [...new Set(emptyLegs.map((l) => `${l.from} → ${l.to}`))].join(', ') })}
            {km > 0 && fuelCost > 0 && <> {t('rep.emptyFuel', { amount: f.cur(fuelCost / km) })}</>}
          </span>
        </section>
      )}
    </>
  )
}

// ---------- shared table ----------
interface Row { key: string; label: ReactNode; cells: ReactNode[] }
function Table({ head, rows, note }: { head: string[]; rows: Row[]; note?: string }) {
  return (
    <section className="card stack">
      <div className="table-wrap">
        <table className="table">
          <thead><tr>{head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.key}><td>{r.label}</td>{r.cells.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {note && <span className="label">{note}</span>}
    </section>
  )
}

const money = (f: Fmt, n: number) => <span className={n < 0 ? 'red' : ''}>{f.n(n)}</span>

// ---------- per vehicle / per driver ----------
function tripGroups(trips: Trip[], key: (x: Trip) => string) {
  const m = new Map<string, { trips: number; km: number; income: number; expenses: number }>()
  for (const x of trips) {
    const y = tripTotals(x)
    const g = m.get(key(x)) ?? { trips: 0, km: 0, income: 0, expenses: 0 }
    g.trips++; g.km += x.distanceKm ?? 0; g.income += y.income; g.expenses += y.expenses
    m.set(key(x), g)
  }
  return m
}

function VehiclesTab({ s, trips, extras, t, f }: P & { s: AppState; trips: Trip[]; extras: { vehicleId: string; amount: number }[] }) {
  const g = tripGroups(trips, (x) => x.vehicleId)
  const rows = [...g].map(([id, x]) => {
    const extra = extras.filter((e) => e.vehicleId === id).reduce((a, e) => a + e.amount, 0)
    const profit = x.income - x.expenses - extra
    return { profit, row: {
      key: id,
      label: s.vehicles.find((v) => v.id === id)?.regNo ?? '—',
      cells: [x.trips, f.n(x.km), f.n(x.income), money(f, profit), x.km ? f.dec(profit / x.km, 1) : '—'],
    } }
  }).sort((a, b) => b.profit - a.profit).map((r) => r.row)
  return <Table head={['', t('rep.trips'), t('rep.km'), t('common.income'), t('common.profit'), t('rep.perKm')]} rows={rows} />
}

function DriversTab({ s, trips, t, f }: P & { s: AppState; trips: Trip[] }) {
  const g = tripGroups(trips, (x) => x.driverId ?? '')
  const rows = [...g].map(([id, x]) => {
    const fuel = trips.filter((y) => (y.driverId ?? '') === id && y.distanceKm).map(tripTotals)
    const litres = fuel.reduce((a, y) => a + y.litres, 0)
    const km = trips.filter((y) => (y.driverId ?? '') === id && y.distanceKm && tripTotals(y).litres).reduce((a, y) => a + (y.distanceKm ?? 0), 0)
    return {
      key: id || 'none',
      label: s.members.find((m) => m.id === id)?.name ?? t('rep.noDriverRow'),
      cells: [x.trips, f.n(x.km), money(f, x.income - x.expenses), litres ? f.dec(km / litres, 2) : '—'],
    }
  })
  return <Table head={['', t('rep.trips'), t('rep.km'), t('common.profit'), t('rep.kml')]} rows={rows} />
}

// ---------- per customer / per route ----------
function LegGroups({ trips, by, t, f, showEmpty }: P & { trips: Trip[]; by: (l: Leg) => string; showEmpty?: boolean }) {
  const m = new Map<string, { loads: number; income: number; profit: number }>()
  for (const x of trips) for (const p of legProfits(x)) {
    const k = by(p.leg)
    const g = m.get(k) ?? { loads: 0, income: 0, profit: 0 }
    g.loads++; g.income += p.income; g.profit += p.profit
    m.set(k, g)
  }
  const rows = [...m].sort((a, b) => b[1].profit - a[1].profit).map(([k, g]) => ({
    key: k, label: k, cells: [g.loads, f.n(g.income), money(f, g.profit)],
  }))
  const empty = new Map<string, number>()
  if (showEmpty) trips.flatMap((x) => x.legs).filter((l) => l.empty).forEach((l) => empty.set(by(l), (empty.get(by(l)) ?? 0) + 1))
  if (!rows.length) return <p className="empty-state">{t('rep.noData')}</p>
  return (
    <>
      <Table head={['', t('rep.loadsCol'), t('common.income'), t('common.profit')]} rows={rows} note={t('rep.splitNote')} />
      {empty.size > 0 && (
        <section className="card amber stack" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t('rep.emptyTitle')}</h2>
          {[...empty].map(([k, n]) => <div key={k} className="between" style={{ fontSize: 14 }}><span>{k}</span><span className="strong">× {n}</span></div>)}
        </section>
      )}
    </>
  )
}

// ---------- fuel ----------
function FuelTab({ s, trips, t, f }: P & { s: AppState; trips: Trip[] }) {
  const counted = trips.filter((x) => x.distanceKm && tripTotals(x).litres > 0)
  const byV = new Map<string, { km: number; litres: number; cost: number }>()
  for (const x of counted) {
    const y = tripTotals(x)
    const g = byV.get(x.vehicleId) ?? { km: 0, litres: 0, cost: 0 }
    g.km += x.distanceKm!; g.litres += y.litres; g.cost += y.fuelCost
    byV.set(x.vehicleId, g)
  }
  const rows = [...byV].map(([id, g]) => ({
    kml: g.km / g.litres,
    row: { key: id, label: s.vehicles.find((v) => v.id === id)?.regNo ?? '—', cells: [f.n(g.km), f.dec(g.litres, 0), <b key="k">{f.dec(g.km / g.litres, 2)}</b>, f.dec(g.cost / g.km, 1)] },
  })).sort((a, b) => b.kml - a.kml).map((r) => r.row)

  // Trend: each vehicle's trips compared with that vehicle's own average.
  const all = s.trips.filter((x) => x.distanceKm && tripTotals(x).litres > 0).sort((a, b) => a.startDate.localeCompare(b.startDate))
  const avg = new Map<string, number>()
  for (const id of new Set(all.map((x) => x.vehicleId))) {
    const ms = all.filter((x) => x.vehicleId === id).map((x) => tripTotals(x).mileage!)
    if (ms.length) avg.set(id, ms.reduce((a, b) => a + b, 0) / ms.length)
  }
  const trend = all.slice(-10)
  const max = Math.max(1, ...trend.map((x) => tripTotals(x).mileage!))

  return (
    <>
      {rows.length ? <Table head={['', t('rep.km'), t('rep.litres'), t('rep.kml'), `${f.sym} ${t('rep.perKm')}`]} rows={rows} note={t('rep.fleetNote')} /> : <p className="empty-state">{t('rep.noData')}</p>}
      {all.length >= 3 ? (
        <section className="card stack">
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t('rep.trend')}</h2>
          {trend.map((x) => {
            const m = tripTotals(x).mileage!
            const a = avg.get(x.vehicleId) ?? m
            const low = m < a * 0.9
            return (
              <a key={x.id} href={href({ name: 'trip', tripId: x.id })} className="stack" style={{ gap: 4 }}>
                <div className="between" style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{s.vehicles.find((v) => v.id === x.vehicleId)?.regNo} · {f.range(x.startDate, x.endDate)}</span>
                  <span className={low ? 'red strong' : ''}>{f.dec(m, 2)} km/L{low ? ` · ${t('rep.trendLow')}` : ''}</span>
                </div>
                <div className="bar"><span style={{ width: `${(m / max) * 100}%`, background: low ? 'var(--red)' : undefined }} /></div>
              </a>
            )
          })}
        </section>
      ) : (
        <section className="card dashed stack" style={{ gap: 4 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t('rep.trend')}</h2>
          <span className="small">{t('rep.trendEmpty')}</span>
        </section>
      )}
    </>
  )
}

// ---------- balances (all time) ----------
/** Sri Lankan local numbers (07X…) → international (947X…) for wa.me links */
function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, '')
  return d.startsWith('0') ? '94' + d.slice(1) : d
}

function Balances({ s, t, f }: P & { s: AppState }) {
  const v = useViewer()
  // A load found through a broker is usually collected by that broker, so it counts under them.
  const owed = new Map<string, { kind: 'customer' | 'broker'; items: { trip: Trip; leg: Leg }[] }>()
  for (const trip of s.trips) for (const leg of trip.legs) {
    if (leg.empty || leg.payment === 'paid' || leg.income <= 0) continue
    const kind = leg.broker ? 'broker' : 'customer'
    const name = leg.broker || leg.client || '—'
    const k = `${kind}:${name}`
    const g = owed.get(k) ?? { kind, items: [] }
    g.items.push({ trip, leg })
    owed.set(k, g)
  }
  if (owed.size === 0) return <p className="empty-state">{t('rep.allPaid')}</p>
  const list = [...owed].map(([k, g]) => ({ k, name: k.split(':').slice(1).join(':'), ...g, total: g.items.reduce((a, x) => a + x.leg.income, 0) }))
    .sort((a, b) => b.total - a.total)

  return (
    <>
      <p className="label">{t('rep.brokerRule')}</p>
      {list.map((g) => {
        const contact = s.contacts.find((c) => c.kind === g.kind && c.name === g.name)
        const lines = g.items.map(({ trip, leg }) => `• ${f.range(trip.startDate, trip.endDate)} ${leg.from} → ${leg.to}${leg.cargo ? ` (${leg.cargo})` : ''}: ${f.cur(leg.income)}`).join('\n')
        const text = t('rep.reminder', { name: g.name, business: s.org?.name ?? '', amount: f.cur(g.total), lines })
        const wa = `https://wa.me/${contact?.phone ? waNumber(contact.phone) : ''}?text=${encodeURIComponent(text)}`
        return (
          <section key={g.k} className="card stack">
            <div className="between">
              <div className="stack" style={{ gap: 0 }}>
                <span className="strong">{g.name}</span>
                <span className="label">{t(g.kind === 'broker' ? 'con.brokers' : 'con.customers')} · {t('rep.loads', { n: g.items.length })}</span>
              </div>
              <span className="chip amber">{t('rep.owes', { amount: f.n(g.total) })}</span>
            </div>
            {g.items.map(({ trip, leg }) => (
              <div key={leg.id} className="between" style={{ fontSize: 13 }}>
                <span>{f.range(trip.startDate, trip.endDate)} · {leg.from} → {leg.to}{g.kind === 'broker' && leg.client ? ` · ${leg.client}` : ''}</span>
                <span>{f.n(leg.income)} · {t(`pay.${leg.payment}`)}</span>
              </div>
            ))}
            {v.canEdit && (
              <div className="grid2" style={{ gap: 8 }}>
                <a className="btn primary pill" style={{ height: 44 }} href={wa} target="_blank" rel="noopener">{t('rep.remind')}</a>
                <button className="btn pill" style={{ height: 44 }} onClick={() => actions.markPaid(g.items.map((x) => x.leg.id))}>{t('rep.markPaid')}</button>
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}
