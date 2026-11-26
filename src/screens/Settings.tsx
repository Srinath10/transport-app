import { useState } from 'react'
import { actions, useAppState } from '../store'
import { VEHICLE_TYPES } from '../defaults'
import { useFmt } from '../format'
import { LANGS, categoryLabel, useT } from '../i18n'
import type { FuelType, NumberFormat, VehicleType } from '../types'
import { go, href } from '../router'
import { useViewer } from '../viewer'
import { BottomNav, Icon } from '../ui'

const H2 = ({ children }: { children: string }) => <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>{children}</h2>

export function Settings() {
  const s = useAppState()
  const v = useViewer()
  const { t, lang } = useT()
  const f = useFmt()
  const org = s.org!

  return (
    <>
      <div className="screen with-nav">
        <h1 className="title-xl">{t('set.title')}</h1>

        <section className="stack">
          <H2>{v.canManage ? t('set.language') : t('set.myLanguage')}</H2>
          <div className="seg" role="group" aria-label={t('set.language')}>
            {LANGS.map((l) => <button key={l.id} aria-pressed={lang === l.id} onClick={() => actions.setMyLang(l.id)}>{l.label}</button>)}
          </div>
        </section>

        {v.canManage && (
          <>
            <section className="stack">
              <H2>{t('set.business')}</H2>
              <div className="card stack" style={{ gap: 12 }}>
                <label className="field">{t('set.name')}
                  <input className="input" defaultValue={org.name} onBlur={(e) => e.target.value.trim() && actions.updateOrg({ name: e.target.value.trim() })} />
                </label>
                <div className="grid2" style={{ gap: 8 }}>
                  <label className="field">{t('set.numbers')}
                    <select className="input select" value={org.numberFormat} onChange={(e) => actions.updateOrg({ numberFormat: e.target.value as NumberFormat })}>
                      <option value="intl">1,234,567</option>
                      <option value="indian">12,34,567</option>
                    </select>
                  </label>
                </div>
                {(['diesel', 'petrol'] as FuelType[]).filter((x) => org.fuelPrices[x]).map((x) => (
                  <span key={x} className="label">{t('set.lastFuel', { fuel: t(`fuel.${x}`), amount: `${f.sym} ${f.dec(org.fuelPrices[x]!, 2)}` })}</span>
                ))}
              </div>
            </section>

            <Vehicles />
            <Categories />
            <People />
          </>
        )}

        {s.members.length > 0 && (v.canManage || v.previewing) && (
          <section className="stack">
            <H2>{t('set.preview')}</H2>
            <span className="label">{t('set.previewHelp')}</span>
            <div className="card list">
              <button className="list-row" onClick={() => actions.setPreview(null)}>
                <span className="strong">{t('role.owner')}</span>
                {!v.previewing && <span className="chip accent">{t('home.selected')}</span>}
              </button>
              {s.members.map((m) => (
                <button key={m.id} className="list-row" onClick={() => { actions.setPreview(m.id); go({ name: 'home' }) }}>
                  <span><span className="strong">{m.name}</span> <span className="label">· {t(`role.${m.role}`)}</span></span>
                  {v.member?.id === m.id && <span className="chip accent">{t('home.selected')}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {v.canManage && <Erase />}
      </div>
      <BottomNav active="settings" />
    </>
  )
}

function Vehicles() {
  const s = useAppState()
  const { t } = useT()
  const [adding, setAdding] = useState(false)
  const [regNo, setRegNo] = useState('')
  const [type, setType] = useState<VehicleType>('lorry')
  const [fuel, setFuel] = useState<FuelType>('diesel')
  return (
    <section className="stack">
      <H2>{t('set.vehicles')}</H2>
      <div className="card list">
        {s.vehicles.map((x) => (
          <div key={x.id} className={`list-row ${x.archived ? 'muted-row' : ''}`} style={{ flexWrap: 'wrap' }}>
            <div className="stack grow" style={{ gap: 6 }}>
              <span className="row strong"><Icon.Truck size={20} /> {x.regNo}{x.archived && <span className="chip">{t('set.archived')}</span>}</span>
              <div className="row" style={{ gap: 6 }}>
                <select aria-label={t('set.type')} className="input select" style={{ height: 40, fontSize: 14 }} value={x.type} onChange={(e) => actions.updateVehicle(x.id, { type: e.target.value as VehicleType })}>
                  {VEHICLE_TYPES.map((k) => <option key={k} value={k}>{t(`vtype.${k}`)}</option>)}
                </select>
                <select aria-label={t('set.fuel')} className="input select" style={{ height: 40, fontSize: 14 }} value={x.fuel} onChange={(e) => actions.updateVehicle(x.id, { fuel: e.target.value as FuelType })}>
                  <option value="diesel">{t('fuel.diesel')}</option>
                  <option value="petrol">{t('fuel.petrol')}</option>
                </select>
              </div>
            </div>
            <button className="btn pill ghost" onClick={() => actions.updateVehicle(x.id, { archived: !x.archived })}>
              {x.archived ? t('set.restore') : t('set.archive')}
            </button>
          </div>
        ))}
      </div>
      {adding ? (
        <form
          className="card stack"
          style={{ gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault()
            if (!regNo.trim()) return
            actions.addVehicle({ regNo: regNo.trim().toUpperCase(), type, fuel })
            setRegNo(''); setAdding(false)
          }}
        >
          <label className="field">{t('set.regNo')}
            <input className="input" value={regNo} placeholder={t('onb.regPh')} onChange={(e) => setRegNo(e.target.value)} autoFocus required />
          </label>
          <div className="grid2" style={{ gap: 8 }}>
            <label className="field">{t('set.type')}
              <select className="input select" value={type} onChange={(e) => setType(e.target.value as VehicleType)}>
                {VEHICLE_TYPES.map((k) => <option key={k} value={k}>{t(`vtype.${k}`)}</option>)}
              </select>
            </label>
            <label className="field">{t('set.fuel')}
              <select className="input select" value={fuel} onChange={(e) => setFuel(e.target.value as FuelType)}>
                <option value="diesel">{t('fuel.diesel')}</option>
                <option value="petrol">{t('fuel.petrol')}</option>
              </select>
            </label>
          </div>
          <div className="grid2" style={{ gap: 8 }}>
            <button type="button" className="btn ghost" onClick={() => setAdding(false)}>{t('common.cancel')}</button>
            <button className="btn dark" disabled={!regNo.trim()}>{t('common.add')}</button>
          </div>
        </form>
      ) : (
        <button className="btn ghost" onClick={() => setAdding(true)}>+ {t('set.addVehicle')}</button>
      )}
    </section>
  )
}

function Categories() {
  const s = useAppState()
  const { t } = useT()
  const [name, setName] = useState('')
  const list = [...s.categories].sort((a, b) => a.order - b.order)
  return (
    <section className="stack">
      <H2>{t('set.categories')}</H2>
      <span className="label">{t('set.catHelp')}</span>
      <div className="card list">
        {list.map((c, i) => (
          <div key={c.id} className={`list-row ${c.hidden ? 'muted-row' : ''}`} style={{ gap: 6 }}>
            <div className="stack grow" style={{ gap: 2 }}>
              <input
                className="input"
                style={{ height: 40, fontSize: 15 }}
                aria-label={categoryLabel(c, t)}
                defaultValue={categoryLabel(c, t)}
                key={categoryLabel(c, t)}
                onBlur={(e) => {
                  const val = e.target.value.trim()
                  // Typing the translated name back means "use the built-in label".
                  if (val && val !== categoryLabel({ ...c, name: '' }, t)) actions.renameCategory(c.id, val)
                  else if (c.builtIn) actions.renameCategory(c.id, '')
                }}
              />
              {c.vehicleTypes && <span className="label">{t('set.onlyFor', { types: c.vehicleTypes.map((k) => t(`vtype.${k}`)).join(', ') })}</span>}
            </div>
            <button className="icon-sm" aria-label={t('set.moveUp')} disabled={i === 0} onClick={() => actions.moveCategory(c.id, -1)}><Icon.Up /></button>
            <button className="icon-sm" aria-label={t('set.moveDown')} disabled={i === list.length - 1} onClick={() => actions.moveCategory(c.id, 1)}><Icon.Down /></button>
            <button className="btn pill ghost" style={{ minWidth: 64 }} onClick={() => actions.toggleCategory(c.id)}>{c.hidden ? t('set.show') : t('set.hide')}</button>
          </div>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { actions.addCategory(name); setName('') } }}>
        <label className="field grow">{t('set.addCat')}
          <input className="input" value={name} placeholder={t('set.catPh')} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn dark" style={{ alignSelf: 'flex-end', height: 48 }} disabled={!name.trim()}>{t('common.add')}</button>
      </form>
    </section>
  )
}

function People() {
  const s = useAppState()
  const { t } = useT()
  return (
    <section className="stack">
      <H2>{t('set.people')}</H2>
      {s.members.length === 0 ? <span className="small">{t('set.noPeople')}</span> : (
        <div className="card list">
          {s.members.map((m) => (
            <a key={m.id} className="list-row" href={href({ name: 'member', memberId: m.id })}>
              <div className="stack" style={{ gap: 0 }}>
                <span className="strong">{m.name}</span>
                <span className="label">
                  {t(`role.${m.role}`)}
                  {m.role === 'driver' && m.vehicleIds.length > 0 && ` · ${m.vehicleIds.map((id) => s.vehicles.find((x) => x.id === id)?.regNo).filter(Boolean).join(', ')}`}
                </span>
              </div>
              <span className="label">›</span>
            </a>
          ))}
        </div>
      )}
      <div className="grid2" style={{ gap: 8 }}>
        <a className="btn primary" href={href({ name: 'member', role: 'driver' })}>{t('set.invite')}</a>
        <a className="btn ghost" href={href({ name: 'member', role: 'accountant' })}>{t('set.addAccountant')}</a>
      </div>
    </section>
  )
}

function Erase() {
  const { t } = useT()
  const [confirm, setConfirm] = useState(false)
  return (
    <section className="stack">
      <H2>{t('set.data')}</H2>
      {confirm ? (
        <div className="card stack">
          <span className="strong">{t('set.eraseConfirm')}</span>
          <div className="grid2">
            <button className="btn ghost" onClick={() => setConfirm(false)}>{t('common.keep')}</button>
            <button className="btn" style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }} onClick={() => { actions.eraseAll(); go({ name: 'home' }, true) }}>{t('set.eraseYes')}</button>
          </div>
        </div>
      ) : (
        <button className="btn danger" onClick={() => setConfirm(true)}>{t('set.erase')}</button>
      )}
    </section>
  )
}
