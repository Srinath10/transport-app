import { useState } from 'react'
import { actions, useAppState } from '../store'
import { useFmt } from '../format'
import { useT } from '../i18n'
import type { Contact } from '../types'
import { useViewer } from '../viewer'
import { BottomNav, NotFound } from '../ui'

export function Contacts() {
  const s = useAppState()
  const v = useViewer()
  const { t } = useT()
  const f = useFmt()
  if (!v.seeMoney) return <NotFound />

  const stats = (c: Contact) => {
    const legs = s.trips.flatMap((x) => x.legs).filter((l) => !l.empty && (c.kind === 'customer' ? l.client === c.name : l.broker === c.name))
    return {
      loads: legs.length,
      total: legs.reduce((a, l) => a + l.income, 0),
      owed: legs.filter((l) => l.payment !== 'paid').reduce((a, l) => a + l.income, 0),
    }
  }
  const section = (kind: Contact['kind'], title: string) => {
    const list = s.contacts.filter((c) => c.kind === kind).map((c) => ({ c, ...stats(c) })).sort((a, b) => b.total - a.total)
    if (!list.length) return null
    return (
      <section className="stack">
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>{title}</h2>
        <div className="card list">
          {list.map(({ c, loads, total, owed }) => (
            <div key={c.id} className="list-row" style={{ flexWrap: 'wrap' }}>
              <div className="stack grow" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</span>
                <span className="label">{t('rep.loads', { n: loads })} · {t('con.total', { amount: f.cur(total) })}</span>
                <PhoneField contact={c} editable={v.canEdit} />
              </div>
              {owed > 0 ? <span className="chip amber">{t('rep.owes', { amount: f.n(owed) })}</span> : <span className="chip green">{t('con.paidUp')}</span>}
            </div>
          ))}
        </div>
      </section>
    )
  }
  const customers = section('customer', t('con.customers'))
  const brokers = section('broker', t('con.brokers'))
  const drivers = s.members.filter((m) => m.role === 'driver')

  return (
    <>
      <div className="screen with-nav">
        <h1 className="title-xl">{t('con.title')}</h1>
        {!customers && !brokers && <p className="empty-state">{t('con.empty')}</p>}
        {customers}
        {brokers}
        {drivers.length > 0 && (
          <section className="stack">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>{t('con.drivers')}</h2>
            <div className="card list">
              {drivers.map((d) => (
                <div key={d.id} className="list-row">
                  <div className="stack" style={{ gap: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{d.name}</span>
                    {d.phone && <span className="label">{d.phone}</span>}
                  </div>
                  <span className="label">{t('con.trips', { n: s.trips.filter((x) => x.driverId === d.id).length })}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <BottomNav active="contacts" />
    </>
  )
}

function PhoneField({ contact, editable }: { contact: Contact; editable: boolean }) {
  const { t } = useT()
  const [edit, setEdit] = useState(false)
  if (!editable) return contact.phone ? <span className="label">{contact.phone}</span> : null
  if (!edit) {
    return (
      <button onClick={() => setEdit(true)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', minHeight: 32, fontSize: 13, color: contact.phone ? 'var(--ink)' : 'var(--muted)', textDecoration: contact.phone ? 'none' : 'underline' }}>
        {contact.phone || t('con.addPhone')}
      </button>
    )
  }
  return (
    <form className="row" onSubmit={(e) => { e.preventDefault(); actions.updateContact(contact.id, { phone: String(new FormData(e.currentTarget).get('phone') ?? '').trim() }); setEdit(false) }}>
      <input name="phone" type="tel" inputMode="tel" className="input" style={{ height: 40 }} defaultValue={contact.phone} aria-label={t('con.phone')} autoFocus />
      <button className="btn pill dark">OK</button>
    </form>
  )
}
