import { useState } from 'react'
import { actions } from '../store'
import { LANGS, makeT } from '../i18n'
import { VEHICLE_TYPES } from '../defaults'
import type { FuelType, Lang, VehicleType } from '../types'

export function Onboarding() {
  const [step, setStep] = useState(1)
  const [lang, setLang] = useState<Lang>('en')
  const [name, setName] = useState('')
  const [regNo, setRegNo] = useState('')
  const [type, setType] = useState<VehicleType>('lorry')
  const [fuel, setFuel] = useState<FuelType>('diesel')
  const [driver, setDriver] = useState('')
  const [phone, setPhone] = useState('')
  const t = makeT(lang)

  const finish = (withDriver: boolean) =>
    actions.completeOnboarding({
      name: name.trim(), lang,
      vehicle: { regNo: regNo.trim().toUpperCase(), type, fuel },
      driver: withDriver && driver.trim() ? { name: driver.trim(), phone: phone.trim() } : null,
    })

  return (
    <div className="screen" style={{ gap: 18 }}>
      <div className="steps" aria-hidden="true">{[1, 2, 3].map((n) => <span key={n} className={n <= step ? 'on' : ''} />)}</div>
      <span className="eyebrow">{t('onb.step', { n: step })}</span>

      {step === 1 && (
        <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep(2) }}>
          <h1 className="title-xl">{t('onb.welcome')}</h1>
          <div className="seg" role="group" aria-label={t('set.language')}>
            {LANGS.map((l) => <button type="button" key={l.id} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>)}
          </div>
          <label className="field">{t('set.name')}
            <input className="input" value={name} placeholder={t('onb.bizPh')} onChange={(e) => setName(e.target.value)} autoFocus required />
          </label>
          <button className="btn big primary" disabled={!name.trim()}>{t('common.next')}</button>
        </form>
      )}

      {step === 2 && (
        <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (regNo.trim()) setStep(3) }}>
          <h1 className="title-xl">{t('onb.vehicle')}</h1>
          <label className="field">{t('set.regNo')}
            <input className="input" value={regNo} placeholder={t('onb.regPh')} onChange={(e) => setRegNo(e.target.value)} autoFocus required />
          </label>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 4 }}>{t('set.type')}</legend>
            <div className="grid3">
              {VEHICLE_TYPES.map((v) => (
                <button type="button" key={v} className="cat" style={{ height: 48 }} aria-pressed={type === v} onClick={() => setType(v)}>
                  <span className="en">{t(`vtype.${v}`)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="seg" role="group" aria-label={t('set.fuel')}>
            {(['diesel', 'petrol'] as FuelType[]).map((f) => <button type="button" key={f} aria-pressed={fuel === f} onClick={() => setFuel(f)}>{t(`fuel.${f}`)}</button>)}
          </div>
          <div className="grid2">
            <button type="button" className="btn ghost" onClick={() => setStep(1)}>{t('common.back')}</button>
            <button className="btn primary" disabled={!regNo.trim()}>{t('common.next')}</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); finish(true) }}>
          <h1 className="title-xl">{t('onb.driver')}</h1>
          <p className="small">{t('onb.driverHelp')}</p>
          <label className="field">{t('inv.name')}
            <input className="input" value={driver} onChange={(e) => setDriver(e.target.value)} autoFocus />
          </label>
          <label className="field">{t('inv.phone')}
            <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <button className="btn big primary" disabled={!driver.trim()}>{t('onb.finish')}</button>
          <div className="grid2">
            <button type="button" className="btn ghost" onClick={() => setStep(2)}>{t('common.back')}</button>
            <button type="button" className="btn ghost" onClick={() => finish(false)}>{t('common.skip')}</button>
          </div>
        </form>
      )}
    </div>
  )
}
