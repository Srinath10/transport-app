import { useState } from 'react'
import { actions, useAppState } from '../store'
import { monthKey, routeLabel, todayISO, tripTotals } from '../calc'
import { useFmt } from '../format'
import { useT } from '../i18n'
import { href } from '../router'
import { useCurrentVehicle, useViewer } from '../viewer'
import { BottomNav, Icon, Sheet } from '../ui'

export function Home() {
  const s = useAppState()
  const v = useViewer()
  const { t } = useT()
  const f = useFmt()
  const [picker, setPicker] = useState(false)
  const vehicle = useCurrentVehicle()

  if (!vehicle) {
    return (
      <>
        <div className="screen with-nav">
          <h1 className="title-xl">{t('home.myTrips')}</h1>
          <p className="empty-state">{t('home.noVehicle')}</p>
        </div>
        <BottomNav active="home" />
      </>
    )
  }

  const trips = s.trips
    .filter((x) => x.vehicleId === vehicle.id && (v.role !== 'driver' || x.driverId === v.member?.id))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))

  const month = monthKey(trips[0]?.startDate ?? todayISO())
  const monthTrips = trips.filter((x) => monthKey(x.startDate) === month)
  const m = monthTrips.reduce(
    (acc, x) => {
      const y = tripTotals(x)
      return { income: acc.income + y.income, expenses: acc.expenses + y.expenses, km: acc.km + (x.distanceKm ?? 0) }
    },
    { income: 0, expenses: 0, km: 0 },
  )
  const open = trips.find((x) => x.status === 'open')
  const canSwitch = v.vehicles.length > 1 || v.canManage

  return (
    <>
      <div className="screen with-nav">
        <div className="between">
          <div className="stack" style={{ gap: 2, minWidth: 0 }}>
            <span className="eyebrow">{s.org?.name}</span>
            <h1 className="title-xl">{v.role === 'driver' ? t('home.myTrips') : t('home.title')}</h1>
          </div>
          <button
            className="btn primary"
            style={{ borderRadius: 22, padding: '0 14px', fontSize: 15, flex: 'none' }}
            aria-label={t('home.vehicleAria', { v: vehicle.regNo })}
            onClick={() => canSwitch && setPicker(true)}
          >
            <Icon.Truck size={20} />
            {vehicle.regNo}
          </button>
        </div>

        {v.seeMoney && (
          <div className="card dark stack" style={{ borderRadius: 20, padding: 20, gap: 14 }}>
            <div className="between baseline">
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-on-dark)' }}>{f.month(month)}</span>
              <span style={{ fontSize: 13, color: 'var(--muted-on-dark)' }}>{t('home.monthSub', { n: monthTrips.length, km: f.n(m.km) })}</span>
            </div>
            <div className="stat">
              <span className="label" style={{ fontSize: 13 }}>{t('common.profit')}</span>
              <span style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 800, color: 'var(--accent)' }}>{f.cur(m.income - m.expenses)}</span>
            </div>
            <div className="grid2" style={{ borderTop: '1px solid #3a3e44', paddingTop: 14 }}>
              <div className="stat"><span className="label">{t('common.income')}</span><span style={{ fontSize: 18, fontWeight: 700 }}>{f.n(m.income)}</span></div>
              <div className="stat"><span className="label">{t('common.expenses')}</span><span style={{ fontSize: 18, fontWeight: 700 }}>{f.n(m.expenses)}</span></div>
            </div>
          </div>
        )}

        {v.canAdd && (open ? (
          <a className="btn big primary" href={href({ name: 'trip', tripId: open.id })}><Icon.Truck /> {t('home.continue')}</a>
        ) : (
          <a className="btn big primary" href={href({ name: 'newTrip' })}><Icon.Plus /> {t('home.start')}</a>
        ))}

        <section className="stack">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>{t('home.recent')}</h2>
          {trips.length === 0 && <p className="empty-state">{t('home.noTrips', { v: vehicle.regNo })}</p>}
          {trips.map((x) => {
            const y = tripTotals(x)
            return (
              <a key={x.id} className="card stack" href={href({ name: 'trip', tripId: x.id })}>
                <div className="between">
                  <span className="small" style={{ fontWeight: 600 }}>{f.range(x.startDate, x.endDate)} · {t('home.legs', { n: x.legs.length })}</span>
                  <span className={`chip ${x.status === 'closed' ? 'green' : 'accent'}`} style={{ fontWeight: 700, padding: '4px 10px', borderRadius: 10 }}>
                    {x.status === 'closed' ? t('common.closed') : t('common.open')}
                  </span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>{routeLabel(x) || t('home.noRoute')}</span>
                {x.legs.length > 0 && (
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                    {x.legs.filter((l) => !l.empty && l.cargo).map((l) => <span key={l.id} className="chip">{l.cargo}</span>)}
                    {y.emptyLegs > 0 && <span className="chip amber">{t('home.emptyLegs', { n: y.emptyLegs })}</span>}
                  </div>
                )}
                <div className="between baseline" style={{ borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
                  <span className="small">
                    {y.mileage ? `${f.dec(y.mileage, 2)} km/L · ` : ''}{x.distanceKm ? `${f.n(x.distanceKm)} km` : t('home.kmNotSet')}
                  </span>
                  {v.seeMoney && <span style={{ fontSize: 18, fontWeight: 800 }} className={y.profit >= 0 ? 'green' : 'red'}>{f.signed(y.profit)}</span>}
                </div>
              </a>
            )
          })}
        </section>
      </div>
      <BottomNav active="home" />
      {picker && <VehiclePicker onClose={() => setPicker(false)} />}
    </>
  )
}

function VehiclePicker({ onClose }: { onClose: () => void }) {
  const v = useViewer()
  const current = useCurrentVehicle()
  const { t } = useT()
  return (
    <Sheet title={t('home.chooseVehicle')} onClose={onClose}>
      <div className="card list">
        {v.vehicles.map((x) => (
          <button key={x.id} className="list-row" onClick={() => { actions.selectVehicle(x.id); onClose() }}>
            <span className="row strong"><Icon.Truck size={20} /> {x.regNo} <span className="label" style={{ fontWeight: 500 }}>{t(`vtype.${x.type}`)}</span></span>
            {x.id === current?.id && <span className="chip accent">{t('home.selected')}</span>}
          </button>
        ))}
      </div>
      {v.canManage && <a className="btn ghost" href={href({ name: 'settings' })} onClick={onClose}>{t('set.addVehicle')}</a>}
    </Sheet>
  )
}
