import { useState } from 'react'
import { actions, uid, useAppState } from '../store'
import { legIncome } from '../calc'
import { RATE_TYPES } from '../defaults'
import { useFmt } from '../format'
import { useT } from '../i18n'
import type { Leg, RateType } from '../types'
import { go } from '../router'
import { canViewTrip, useViewer } from '../viewer'
import { NotFound, TopBar } from '../ui'

export function LegForm({ tripId, legId }: { tripId: string; legId?: string }) {
  const s = useAppState()
  const v = useViewer()
  const { t } = useT()
  const f = useFmt()
  const trip = s.trips.find((x) => x.id === tripId)
  const existing = trip?.legs.find((l) => l.id === legId)
  const prev = trip?.legs[trip.legs.length - 1]
  // Default to the rate type this owner used last.
  const lastRate = s.trips.flatMap((x) => x.legs).filter((l) => !l.empty).at(-1)?.rateType ?? 'fixed'

  const [leg, setLeg] = useState<Leg>(
    existing ?? {
      id: uid(), from: prev?.to ?? '', to: '', empty: false, cargo: '', client: '', broker: '',
      rateType: lastRate, quantity: 0, rate: 0, income: 0, timing: '', payment: 'unset', createdBy: v.member?.id ?? null,
    },
  )
  if (!trip || !canViewTrip(v, trip) || !v.canAdd || (existing && !v.canEdit)) return <NotFound />

  // Suggest places and contacts already used, so there's little typing on the road.
  const places = [...new Set(s.trips.flatMap((x) => x.legs.flatMap((l) => [l.from, l.to])).filter(Boolean))]
  const customers = s.contacts.filter((c) => c.kind === 'customer').map((c) => c.name)
  const brokers = s.contacts.filter((c) => c.kind === 'broker').map((c) => c.name)
  const set = <K extends keyof Leg>(k: K, val: Leg[K]) => setLeg((l) => ({ ...l, [k]: val }))
  const income = legIncome(leg.rateType, leg.quantity, leg.rate)
  // Drivers don't see money, so they can log a load without its price; the owner fills it in.
  const needsMoney = v.seeMoney && !leg.empty
  const valid = leg.from.trim() && leg.to.trim() && (!needsMoney || income > 0)
  const unit = leg.rateType === 'fixed' ? '' : t(`unit.${leg.rateType}` as 'unit.per_kg')
  const num = (val: string) => parseFloat(val.replace(/[^\d.]/g, '')) || 0

  return (
    <div className="screen" style={{ gap: 16 }}>
      <TopBar back={{ name: 'trip', tripId }} close backLabel={t('common.close')} title={existing ? t('leg.edit') : t('leg.add')} />
      <form
        className="stack"
        style={{ gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          const empty = leg.empty
          actions.saveLeg(tripId, {
            ...leg,
            from: leg.from.trim(), to: leg.to.trim(),
            cargo: empty ? '' : leg.cargo.trim(), client: empty ? '' : leg.client.trim(), broker: empty ? '' : leg.broker.trim(),
            quantity: empty || leg.rateType === 'fixed' ? 0 : leg.quantity,
            rate: empty ? 0 : leg.rate,
            income: empty ? 0 : income,
          })
          go({ name: 'trip', tripId }, true)
        }}
      >
        <datalist id="places">{places.map((p) => <option key={p} value={p} />)}</datalist>
        <datalist id="customers">{customers.map((p) => <option key={p} value={p} />)}</datalist>
        <datalist id="brokers">{brokers.map((p) => <option key={p} value={p} />)}</datalist>

        <div className="grid2" style={{ gap: 8 }}>
          <label className="field">{t('leg.from')}
            <input className="input" list="places" value={leg.from} onChange={(e) => set('from', e.target.value)} required />
          </label>
          <label className="field">{t('leg.to')}
            <input className="input" list="places" value={leg.to} onChange={(e) => set('to', e.target.value)} required />
          </label>
        </div>

        <div className="seg" role="group" aria-label={t('leg.loadGroup')}>
          <button type="button" aria-pressed={!leg.empty} onClick={() => set('empty', false)}>{t('leg.loaded')}</button>
          <button type="button" aria-pressed={leg.empty} onClick={() => set('empty', true)}>{t('leg.empty')}</button>
        </div>

        {!leg.empty && (
          <>
            <label className="field">{t('leg.cargo')}
              <input className="input" value={leg.cargo} placeholder={t('leg.cargoPh')} onChange={(e) => set('cargo', e.target.value)} />
            </label>
            <label className="field">{t('leg.client')}
              <input className="input" list="customers" value={leg.client} placeholder={t('leg.clientPh')} onChange={(e) => set('client', e.target.value)} />
            </label>
            <label className="field">{t('leg.broker')}
              <input className="input" list="brokers" value={leg.broker} onChange={(e) => set('broker', e.target.value)} />
            </label>

            {v.seeMoney && (
              <>
                <label className="field">{t('leg.rateType')}
                  <select className="input select" value={leg.rateType} onChange={(e) => set('rateType', e.target.value as RateType)}>
                    {RATE_TYPES.map((r) => <option key={r} value={r}>{t(`rate.${r}`)}</option>)}
                  </select>
                </label>
                {leg.rateType === 'fixed' ? (
                  <label className="field">{t('leg.hire', { sym: f.sym })}
                    <input className="input" inputMode="numeric" value={leg.rate ? String(leg.rate) : ''} placeholder="0" onChange={(e) => set('rate', num(e.target.value))} required />
                  </label>
                ) : (
                  <>
                    <div className="grid2" style={{ gap: 8 }}>
                      <label className="field">{t('leg.quantity', { unit })}
                        <input className="input" inputMode="decimal" value={leg.quantity ? String(leg.quantity) : ''} placeholder="0" onChange={(e) => set('quantity', num(e.target.value))} required />
                      </label>
                      <label className="field">{t('leg.rate', { unit, sym: f.sym })}
                        <input className="input" inputMode="decimal" value={leg.rate ? String(leg.rate) : ''} placeholder="0" onChange={(e) => set('rate', num(e.target.value))} required />
                      </label>
                    </div>
                    <div className="card between baseline" style={{ padding: '10px 14px' }}>
                      <span className="small">{f.dec(leg.quantity, 0)} {unit} × {f.sym} {f.dec(leg.rate, 2)}</span>
                      <span className="strong" style={{ fontSize: 18 }}>{t('leg.total', { amount: f.cur(income) })}</span>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        <label className="field">{t('leg.when')}
          <input className="input" value={leg.timing} placeholder={t('leg.whenPh')} onChange={(e) => set('timing', e.target.value)} />
        </label>

        <button className="btn big dark" disabled={!valid}>{t('leg.save')}</button>
        {existing && (
          <button type="button" className="btn danger" onClick={() => { actions.deleteLeg(tripId, existing.id); go({ name: 'trip', tripId }, true) }}>
            {t('leg.delete')}
          </button>
        )}
      </form>
    </div>
  )
}
