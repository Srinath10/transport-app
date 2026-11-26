import { useState } from 'react'
import { actions, useAppState } from '../store'
import { LANGS, useT } from '../i18n'
import type { Lang, Member } from '../types'
import { go } from '../router'
import { useViewer } from '../viewer'
import { NotFound, TopBar } from '../ui'

/** "Invite driver" / "Add accountant", and editing either. */
export function MemberForm({ memberId, role }: { memberId?: string; role?: Member['role'] }) {
  const s = useAppState()
  const v = useViewer()
  const { t } = useT()
  const existing = s.members.find((m) => m.id === memberId)
  const r = existing?.role ?? role ?? 'driver'
  const [name, setName] = useState(existing?.name ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [vehicleIds, setVehicleIds] = useState<string[]>(existing?.vehicleIds ?? (s.currentVehicleId ? [s.currentVehicleId] : []))
  const [lang, setLang] = useState<Lang | null>(existing?.lang ?? null)
  const [confirm, setConfirm] = useState(false)
  if (!v.canManage || (memberId && !existing)) return <NotFound />

  const toggle = (id: string) => setVehicleIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const title = existing ? t('inv.titleEdit', { name: existing.name }) : r === 'driver' ? t('inv.title') : t('inv.titleAcc')

  return (
    <div className="screen" style={{ gap: 16 }}>
      <TopBar back={{ name: 'settings' }} close backLabel={t('common.close')} title={title} />
      <p className="small" style={{ lineHeight: 1.45 }}>{r === 'driver' ? t('inv.canDo') : t('inv.canDoAcc')}</p>
      <form
        className="stack"
        style={{ gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          const data = { name: name.trim(), phone: phone.trim(), role: r, vehicleIds: r === 'driver' ? vehicleIds : [], lang }
          if (existing) actions.updateMember(existing.id, data)
          else actions.addMember(data)
          go({ name: 'settings' }, true)
        }}
      >
        <label className="field">{t('inv.name')}
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus={!existing} />
        </label>
        <label className="field">{t('inv.phone')}
          <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        {r === 'driver' && (
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 4 }}>{t('inv.vehicles')}</legend>
            <div className="card list">
              {s.vehicles.filter((x) => !x.archived).map((x) => (
                <label key={x.id} className="check list-row" style={{ justifyContent: 'flex-start' }}>
                  <input type="checkbox" checked={vehicleIds.includes(x.id)} onChange={() => toggle(x.id)} />
                  {x.regNo} <span className="label" style={{ fontWeight: 500 }}>{t(`vtype.${x.type}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="field">{t('inv.lang')}
          <div className="seg" role="group" aria-label={t('inv.lang')}>
            {LANGS.map((l) => (
              <button type="button" key={l.id} aria-pressed={(lang ?? s.org?.lang) === l.id} onClick={() => setLang(l.id)}>{l.label}</button>
            ))}
          </div>
        </div>
        <p className="label" style={{ lineHeight: 1.45 }}>{t('inv.syncNote')}</p>
        <button className="btn big dark" disabled={!name.trim() || (r === 'driver' && vehicleIds.length === 0)}>{t('common.save')}</button>
        {existing && (confirm ? (
          <div className="grid2">
            <button type="button" className="btn ghost" onClick={() => setConfirm(false)}>{t('common.keep')}</button>
            <button type="button" className="btn" style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }} onClick={() => { actions.removeMember(existing.id); go({ name: 'settings' }, true) }}>{t('inv.remove')}</button>
          </div>
        ) : (
          <button type="button" className="btn danger" onClick={() => setConfirm(true)}>{t('inv.remove')}</button>
        ))}
      </form>
    </div>
  )
}
