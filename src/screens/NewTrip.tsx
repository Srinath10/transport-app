import { useState } from 'react'
import { actions, useAppState } from '../store'
import { todayISO } from '../calc'
import { useT } from '../i18n'
import { go } from '../router'
import { useCurrentVehicle, useViewer } from '../viewer'
import { NotFound, TopBar } from '../ui'

export function NewTrip() {
  const s = useAppState()
  const v = useViewer()
  const { t } = useT()
  const current = useCurrentVehicle()
  const [vehicleId, setVehicleId] = useState(current?.id ?? '')
  const drivers = s.members.filter((m) => m.role === 'driver')
  const lastDriver = s.trips.find((x) => x.vehicleId === vehicleId && x.driverId)?.driverId
  const [driverId, setDriverId] = useState<string>(v.role === 'driver' ? v.member!.id : lastDriver ?? '')
  const [date, setDate] = useState(todayISO())
  if (!v.canAdd || !current) return <NotFound />

  // Drivers assigned to the chosen vehicle come first.
  const sorted = [...drivers].sort((a, b) => Number(b.vehicleIds.includes(vehicleId)) - Number(a.vehicleIds.includes(vehicleId)))

  return (
    <div className="screen">
      <TopBar back={{ name: 'home' }} close backLabel={t('common.close')} title={t('new.title')} />
      <form
        className="stack"
        style={{ gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault()
          actions.selectVehicle(vehicleId)
          const id = actions.startTrip({ vehicleId, driverId: driverId || null, startDate: date })
          go({ name: 'leg', tripId: id }, true)
        }}
      >
        <label className="field">{t('new.vehicle')}
          <select className="input select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {v.vehicles.map((x) => <option key={x.id} value={x.id}>{x.regNo} · {t(`vtype.${x.type}`)}</option>)}
          </select>
        </label>
        {v.role !== 'driver' && (
          <label className="field">{t('new.driver')}
            <select className="input select" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">{t('new.noDriver')}</option>
              {sorted.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        )}
        <label className="field">{t('new.date')}
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <button className="btn big primary">{t('new.start')}</button>
      </form>
    </div>
  )
}
