import { useState } from 'react'
import { actions, useAppState } from '../store'
import { tripTotals } from '../calc'
import { useFmt } from '../format'
import { categoryLabel, useT } from '../i18n'
import { go, href } from '../router'
import { canViewTrip, useViewer } from '../viewer'
import { Icon, NotFound, TopBar } from '../ui'

export function TripDetail({ tripId }: { tripId: string }) {
  const s = useAppState()
  const v = useViewer()
  const { t } = useT()
  const f = useFmt()
  const trip = s.trips.find((x) => x.id === tripId)
  const [editKm, setEditKm] = useState(false)
  if (!trip || !canViewTrip(v, trip)) return <NotFound />
  const vehicle = s.vehicles.find((x) => x.id === trip.vehicleId)
  const driver = s.members.find((m) => m.id === trip.driverId)
  const x = tripTotals(trip)
  const cats = new Map(s.categories.map((c) => [c.id, c]))
  const expenses = [...trip.expenses].sort((a, b) => b.amount - a.amount)
  const open = trip.status === 'open'
  const canAdd = v.canAdd && (open || v.canEdit)
  const canEditKm = v.canEdit || (v.canAdd && open && trip.distanceKm == null)

  return (
    <div className="screen">
      <TopBar
        back={{ name: 'home' }}
        sub={`${vehicle?.regNo ?? ''} · ${t('trip.driver', { name: driver?.name ?? t('trip.noDriver') })}`}
        title={t('trip.title', { dates: f.range(trip.startDate, trip.endDate) })}
      />

      {v.seeMoney ? (
        <div className="grid3">
          <div className="stat-tile stat"><span className="label">{t('common.income')}</span><span className="stat-v">{f.n(x.income)}</span></div>
          <div className="stat-tile stat"><span className="label">{t('common.expenses')}</span><span className="stat-v red">{f.n(x.expenses)}</span></div>
          <div className="stat-tile dark stat"><span className="label">{t('common.profit')}</span><span className="stat-v" style={{ color: 'var(--accent)' }}>{f.n(x.profit)}</span></div>
        </div>
      ) : (
        <div className="stat-tile stat"><span className="label">{t('common.expenses')}</span><span className="stat-v">{f.cur(x.expenses)}</span></div>
      )}

      <section className="stack">
        <div className="between">
          <h2 className="h2">{t('trip.legs')}</h2>
          {canAdd && <a className="btn pill" href={href({ name: 'leg', tripId })}>{t('trip.addLeg')}</a>}
        </div>
        {trip.legs.length === 0 ? (
          <div className="card empty-state">{t('trip.noLegs')}</div>
        ) : (
          <div className="card stack" style={{ gap: 16 }}>
            {trip.legs.map((l, i) => {
              const body = (
                <>
                  <div className="between">
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{l.from} → {l.to}</span>
                    {v.seeMoney && <span style={{ fontSize: 15, fontWeight: 800 }} className={l.empty ? '' : 'green'}>{l.empty ? '0' : f.n(l.income)}</span>}
                  </div>
                  {l.empty ? (
                    <span className="amber" style={{ fontSize: 13, fontWeight: 600 }}>{t('trip.emptyRun')}</span>
                  ) : (
                    <span className="small">{[l.cargo && t('trip.load', { cargo: l.cargo }), l.client].filter(Boolean).join(' · ')}</span>
                  )}
                  {(l.timing || l.broker) && (
                    <span className="label">{[l.timing, l.broker && t('trip.via', { name: l.broker })].filter(Boolean).join(' · ')}</span>
                  )}
                </>
              )
              return (
                <div key={l.id} className="leg">
                  <div className="leg-rail" aria-hidden="true">
                    <span className={`leg-dot ${l.empty ? 'empty' : ''}`} />
                    {i < trip.legs.length - 1 && <span className="leg-line" />}
                  </div>
                  <div className="grow stack" style={{ gap: 4 }}>
                    {v.canEdit
                      ? <a href={href({ name: 'leg', tripId, legId: l.id })} className="stack" style={{ gap: 4 }}>{body}</a>
                      : <div className="stack" style={{ gap: 4 }}>{body}</div>}
                    {!l.empty && v.seeMoney && (
                      <div className="row" style={{ marginTop: 4 }}>
                        {v.canEdit ? (
                          <button
                            className={`chip ${l.payment === 'paid' ? 'green' : 'amber'}`}
                            onClick={() => actions.cyclePayment(tripId, l.id)}
                            aria-label={`${t(`pay.${l.payment}`)}. ${t('pay.tap')}`}
                          >
                            {t(`pay.${l.payment}`)}
                          </button>
                        ) : (
                          <span className={`chip ${l.payment === 'paid' ? 'green' : 'amber'}`}>{t(`pay.${l.payment}`)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="stack">
        <div className="between">
          <h2 className="h2">{t('trip.expenses')}</h2>
          {canAdd && <a className="btn pill primary" style={{ borderWidth: 1 }} href={href({ name: 'addExpense', tripId })}>{t('trip.addExpense')}</a>}
        </div>
        {expenses.length === 0 ? (
          <div className="card empty-state">{t('trip.noExpenses')}</div>
        ) : (
          <div className="card list">
            {expenses.map((e) => {
              const c = cats.get(e.categoryId)
              const inner = (
                <>
                  <div className="stack" style={{ gap: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      {c ? categoryLabel(c, t, vehicle) : '—'}{e.note ? ` (${e.note})` : ''}
                    </span>
                    {e.litres ? <span className="label">{f.dec(e.litres, 3)} L × {f.sym} {f.dec(e.pricePerLitre ?? 0, 2)}</span> : null}
                  </div>
                  <span className="row strong" style={{ fontSize: 15 }}>
                    {e.hasReceipt && <span role="img" aria-label={t('trip.hasReceipt')} style={{ color: 'var(--muted)', display: 'inline-flex' }}><Icon.Camera size={18} /></span>}
                    {f.n(e.amount)}
                  </span>
                </>
              )
              return v.canEdit
                ? <a key={e.id} className="list-row" href={href({ name: 'addExpense', tripId, expenseId: e.id })}>{inner}</a>
                : <div key={e.id} className="list-row">{inner}</div>
            })}
          </div>
        )}
      </section>

      <section className="card grid2">
        <div className="stat">
          <span className="label">{t('trip.distance')}</span>
          {editKm ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const km = Number(new FormData(e.currentTarget).get('km'))
                actions.updateTrip(tripId, { distanceKm: km > 0 ? km : null })
                setEditKm(false)
              }}
              className="row"
            >
              <input name="km" className="input" style={{ height: 40 }} inputMode="numeric" defaultValue={trip.distanceKm ?? ''} autoFocus aria-label={t('trip.kmAria')} />
              <button className="btn pill dark">OK</button>
            </form>
          ) : canEditKm ? (
            <button onClick={() => setEditKm(true)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', fontSize: 15, fontWeight: 700, minHeight: 32 }}>
              {trip.distanceKm ? `${f.n(trip.distanceKm)} km` : t('trip.setKm')} <span className="label">✎</span>
            </button>
          ) : (
            <span style={{ fontSize: 15, fontWeight: 700, minHeight: 32, display: 'flex', alignItems: 'center' }}>{trip.distanceKm ? `${f.n(trip.distanceKm)} km` : '—'}</span>
          )}
        </div>
        <div className="stat">
          <span className="label">{t('trip.mileage')}</span>
          <span style={{ fontSize: 15, fontWeight: 700, minHeight: 32, display: 'flex', alignItems: 'center' }}>
            {x.mileage ? `${f.dec(x.mileage, 2)} km/L` : '—'}
          </span>
        </div>
      </section>

      {v.canEdit ? (
        open ? (
          <button className="btn big dark" onClick={() => { actions.closeTrip(tripId); go({ name: 'summary', tripId }) }} disabled={trip.legs.length === 0}>
            <Icon.Check /> {t('trip.close')}
          </button>
        ) : (
          <div className="stack">
            <a className="btn big dark" href={href({ name: 'summary', tripId })}><Icon.Check /> {t('trip.viewSummary')}</a>
            <button className="btn ghost" onClick={() => actions.reopenTrip(tripId)}>{t('trip.reopen')}</button>
          </div>
        )
      ) : (
        <>
          {v.seeMoney && <a className="btn big dark" href={href({ name: 'summary', tripId })}>{t('trip.viewSummary')}</a>}
          {v.role === 'driver' && <p className="label" style={{ textAlign: 'center' }}>{t('trip.ownerCloses')}</p>}
        </>
      )}
      {v.canEdit && <DeleteTrip tripId={tripId} />}
    </div>
  )
}

function DeleteTrip({ tripId }: { tripId: string }) {
  const { t } = useT()
  const [confirm, setConfirm] = useState(false)
  if (!confirm) return <button className="btn danger" onClick={() => setConfirm(true)}>{t('trip.delete')}</button>
  return (
    <div className="card stack">
      <span className="strong">{t('trip.deleteConfirm')}</span>
      <div className="grid2">
        <button className="btn ghost" onClick={() => setConfirm(false)}>{t('common.keep')}</button>
        <button className="btn" style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }} onClick={() => { actions.deleteTrip(tripId); go({ name: 'home' }, true) }}>{t('common.delete')}</button>
      </div>
    </div>
  )
}
