import { useEffect, useRef, useState } from 'react'
import { actions, uid, useAppState } from '../store'
import { todayISO } from '../calc'
import { fuelCategoryId } from '../defaults'
import { useFmt } from '../format'
import { categoryLabel, tEn, useT } from '../i18n'
import { go } from '../router'
import { canViewTrip, useViewer } from '../viewer'
import { Icon, NotFound, TopBar } from '../ui'
import { compressImage, deleteReceipt, getReceipt, putReceipt } from '../receipts'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫']

export function AddExpense({ tripId, expenseId }: { tripId: string; expenseId?: string }) {
  const s = useAppState()
  const v = useViewer()
  const { t, lang } = useT()
  const f = useFmt()
  const trip = s.trips.find((x) => x.id === tripId)
  const existing = trip?.expenses.find((e) => e.id === expenseId)
  const vehicle = s.vehicles.find((x) => x.id === trip?.vehicleId) ?? null
  const fuelId = s.org ? fuelCategoryId(s.org.id) : ''
  const lastPrice = vehicle ? s.org?.fuelPrices[vehicle.fuel] : undefined

  const cats = s.categories
    .filter((c) => (!c.hidden && (!c.vehicleTypes || !vehicle || c.vehicleTypes.includes(vehicle.type))) || c.id === existing?.categoryId)
    .sort((a, b) => a.order - b.order)

  const [cat, setCat] = useState(existing?.categoryId ?? cats[0]?.id ?? '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [litres, setLitres] = useState(existing?.litres != null ? String(existing.litres) : '')
  const [price, setPrice] = useState(existing?.pricePerLitre != null ? String(existing.pricePerLitre) : lastPrice ? String(lastPrice) : '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [vehicleLevel, setVehicleLevel] = useState(false)
  const [receipt, setReceipt] = useState<Blob | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptChanged, setReceiptChanged] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const id = useRef(existing?.id ?? uid()).current

  const showReceipt = (b: Blob | null) => {
    setReceipt(b)
    if (!b) { setReceiptUrl(null); return }
    const r = new FileReader()
    r.onload = () => setReceiptUrl(r.result as string)
    r.readAsDataURL(b)
  }

  useEffect(() => {
    if (existing?.hasReceipt) getReceipt(existing.id).then((b) => b && showReceipt(b)).catch(() => {})
  }, [existing?.id, existing?.hasReceipt])

  // Drivers may add, but only the owner edits existing entries.
  if (!trip || !canViewTrip(v, trip) || !v.canAdd || (existing && !v.canEdit)) return <NotFound />

  const current = s.categories.find((c) => c.id === cat)
  const catName = current ? categoryLabel(current, t, vehicle) : ''
  const isFuel = cat === fuelId
  const l = parseFloat(litres)
  const p = parseFloat(price)
  const product = l > 0 && p > 0 ? l * p : null
  const n = parseInt(amount || '0', 10)

  const setFuel = (nl: string, np: string) => {
    setLitres(nl)
    setPrice(np)
    const a = parseFloat(nl), b = parseFloat(np)
    if (a > 0 && b > 0) setAmount(String(Math.round(a * b)))
  }

  const press = (k: string) => {
    if (k === '⌫') setAmount((a) => a.slice(0, -1))
    else setAmount((a) => (a.length < 8 ? (a + k).replace(/^0+/, '') : a))
  }

  const save = async () => {
    if (n <= 0 || !cat) return
    if (vehicleLevel) {
      actions.addVehicleExpense({ vehicleId: trip.vehicleId, date: todayISO(), description: note.trim() || catName, amount: n })
      go({ name: 'trip', tripId }, true)
      return
    }
    let hasReceipt = existing?.hasReceipt ?? false
    if (receiptChanged) {
      try {
        if (receipt) { await putReceipt(id, receipt); hasReceipt = true }
        else { await deleteReceipt(id); hasReceipt = false }
      } catch { /* photo storage failed; keep the expense anyway */ }
    }
    actions.saveExpense(tripId, {
      id,
      categoryId: cat,
      amount: n,
      litres: isFuel && l > 0 ? l : undefined,
      pricePerLitre: isFuel && p > 0 ? p : undefined,
      note: note.trim(),
      hasReceipt,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      createdBy: existing?.createdBy ?? v.member?.id ?? null,
    })
    go({ name: 'trip', tripId }, true)
  }

  return (
    <div className="screen" style={{ gap: 14 }}>
      <TopBar
        back={{ name: 'trip', tripId }}
        backLabel={t('common.close')}
        close
        sub={`${t('trip.title', { dates: f.range(trip.startDate, trip.endDate) })} · ${vehicle?.regNo ?? ''}`}
        title={existing ? t('exp.edit') : t('exp.add')}
      />

      <div className="grid3">
        {cats.map((c) => (
          <button key={c.id} className="cat" aria-pressed={c.id === cat} onClick={() => { if (c.id !== cat) { setCat(c.id); if (!existing) setAmount('') } }}>
            <span className="en">{categoryLabel(c, t, vehicle)}</span>
            {!c.name && lang !== 'en' && <span className="tm">{categoryLabel(c, tEn, vehicle)}</span>}
          </button>
        ))}
      </div>

      {isFuel && (
        <div className="grid2" style={{ gap: 8 }}>
          <label className="field">{t('exp.litres')}
            <input className="input" inputMode="decimal" value={litres} placeholder="0.000" onChange={(e) => setFuel(e.target.value, price)} />
          </label>
          <label className="field">{t('exp.pricePerL', { sym: f.sym })}
            <input className="input" inputMode="decimal" value={price} placeholder="0.00" onChange={(e) => setFuel(litres, e.target.value)} />
          </label>
        </div>
      )}

      <div className="card between baseline" style={{ borderRadius: 14, padding: '12px 16px' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>{catName}</span>
        <span className="amount" aria-live="polite">{f.cur(n)}</span>
      </div>
      {isFuel && product != null && (
        <span className="label" style={{ marginTop: -6 }}>{t('exp.auto', { calc: `${litres} × ${price} = ${f.dec(product, 2)}` })}</span>
      )}

      <div className="grid3">
        {KEYS.map((k) => (
          <button key={k} className="key" onClick={() => press(k)} aria-label={k === '⌫' ? t('exp.deleteDigit') : k}>{k}</button>
        ))}
      </div>

      <label className="field">{t('exp.note')}
        <input className="input" value={note} placeholder={current?.builtIn === 'other' || !current?.builtIn ? t('exp.notePh') : ''} onChange={(e) => setNote(e.target.value)} />
      </label>

      {!existing && v.canEdit && (
        <label className="check">
          <input type="checkbox" checked={vehicleLevel} onChange={(e) => setVehicleLevel(e.target.checked)} />
          {t('exp.vehicleLevel')}
        </label>
      )}

      {receiptUrl && !vehicleLevel && (
        <div className="stack" style={{ gap: 6 }}>
          <img className="receipt-thumb" src={receiptUrl} alt={t('exp.receipt')} />
          <button className="btn ghost pill" style={{ alignSelf: 'flex-start' }} onClick={() => { showReceipt(null); setReceiptChanged(true) }}>{t('exp.removePhoto')}</button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          showReceipt(await compressImage(file).catch(() => file))
          setReceiptChanged(true)
          e.target.value = ''
        }}
      />

      <div className="row" style={{ marginTop: 'auto', gap: 8 }}>
        {!vehicleLevel && (
          <button className="icon-btn" style={{ width: 56, height: 56, borderRadius: 16, borderColor: 'var(--ink)' }} aria-label={t('exp.attach')} onClick={() => fileRef.current?.click()}>
            <Icon.Camera />
          </button>
        )}
        <button className="btn big dark grow" disabled={n <= 0 || !cat} onClick={save}>{t('exp.save')}</button>
      </div>
      {existing && (
        <button className="btn danger" onClick={() => { actions.deleteExpense(tripId, existing.id); if (existing.hasReceipt) deleteReceipt(existing.id).catch(() => {}); go({ name: 'trip', tripId }, true) }}>
          {t('exp.delete')}
        </button>
      )}
    </div>
  )
}
