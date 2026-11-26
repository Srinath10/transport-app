import type { ReactNode } from 'react'
import { href, type Route } from './router'
import { useT } from './i18n'
import { useViewer } from './viewer'
import { actions } from './store'

const svg = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
}

export const Icon = {
  Truck: (p: { size?: number }) => (
    <svg {...svg} width={p.size ?? 22} height={p.size ?? 22}><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>
  ),
  Chart: () => <svg {...svg}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  People: () => (
    <svg {...svg}><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-5.6" /></svg>
  ),
  Gear: () => (
    <svg {...svg}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
  ),
  Plus: () => <svg {...svg} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
  Back: () => <svg {...svg} width={20} height={20} strokeWidth={2.2}><path d="M15 18l-6-6 6-6" /></svg>,
  Close: () => <svg {...svg} width={20} height={20} strokeWidth={2.2}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  Check: () => <svg {...svg} width={20} height={20} strokeWidth={2.2}><path d="M20 6L9 17l-5-5" /></svg>,
  Camera: (p: { size?: number }) => (
    <svg {...svg} width={p.size ?? 22} height={p.size ?? 22}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
  ),
  Share: () => (
    <svg {...svg} width={20} height={20}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
  ),
  Up: () => <svg {...svg} width={18} height={18}><path d="M18 15l-6-6-6 6" /></svg>,
  Down: () => <svg {...svg} width={18} height={18}><path d="M6 9l6 6 6-6" /></svg>,
  Eye: () => <svg {...svg} width={18} height={18}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
}

export function TopBar(props: { back: Route; backLabel?: string; close?: boolean; sub?: ReactNode; title: ReactNode; right?: ReactNode }) {
  const { t } = useT()
  return (
    <div className="topbar no-print">
      <a className="icon-btn" href={href(props.back)} aria-label={props.backLabel ?? t('common.back')}>
        {props.close ? <Icon.Close /> : <Icon.Back />}
      </a>
      <div className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
        {props.sub && <span className="sub">{props.sub}</span>}
        <h1 className="title-l">{props.title}</h1>
      </div>
      {props.right}
    </div>
  )
}

type Tab = 'home' | 'reports' | 'contacts' | 'settings'

export function BottomNav({ active }: { active: Tab }) {
  const { t } = useT()
  const v = useViewer()
  const items: { name: Tab; label: string; icon: ReactNode; show: boolean }[] = [
    { name: 'home', label: t('nav.trips'), icon: <Icon.Truck />, show: true },
    { name: 'reports', label: t('nav.reports'), icon: <Icon.Chart />, show: v.canSeeReports },
    { name: 'contacts', label: t('nav.contacts'), icon: <Icon.People />, show: v.seeMoney },
    { name: 'settings', label: t('nav.settings'), icon: <Icon.Gear />, show: true },
  ]
  const shown = items.filter((i) => i.show)
  return (
    <nav className="nav no-print" aria-label="Main">
      <div className="nav-inner" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
        {shown.map((i) => (
          <a key={i.name} href={href({ name: i.name })} aria-current={active === i.name ? 'page' : undefined}>
            {i.icon}
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

/** Shown while the owner previews the app as a driver or accountant. */
export function PreviewBanner() {
  const { t } = useT()
  const v = useViewer()
  if (!v.previewing || !v.member) return null
  return (
    <div className="preview-banner no-print" role="status">
      <span className="row" style={{ gap: 6 }}><Icon.Eye /> {t('prev.banner', { name: v.member.name, role: t(`role.${v.role}`) })}</span>
      <button className="btn pill" onClick={() => actions.setPreview(null)}>{t('prev.exit')}</button>
    </div>
  )
}

export function Sheet(props: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useT()
  return (
    <div className="scrim" onClick={props.onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={props.title} onClick={(e) => e.stopPropagation()}>
        <div className="between">
          <h2 className="title-l">{props.title}</h2>
          <button className="icon-btn" aria-label={t('common.close')} onClick={props.onClose}><Icon.Close /></button>
        </div>
        {props.children}
      </div>
    </div>
  )
}

export function NotFound() {
  const { t } = useT()
  return (
    <div className="screen">
      <TopBar back={{ name: 'home' }} title={t('common.notFoundTitle')} />
      <p className="empty-state">{t('common.notFound')}</p>
    </div>
  )
}

/** Second line in English under a Tamil label, as in the original design. */
export function Sub({ en, lang }: { en: string; lang: string }) {
  return lang === 'en' ? null : <span className="tm">{en}</span>
}
