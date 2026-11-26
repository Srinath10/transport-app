import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'reports' }
  | { name: 'contacts' }
  | { name: 'settings' }
  | { name: 'member'; memberId?: string; role?: 'driver' | 'accountant' }
  | { name: 'newTrip' }
  | { name: 'trip'; tripId: string }
  | { name: 'summary'; tripId: string }
  | { name: 'addExpense'; tripId: string; expenseId?: string }
  | { name: 'leg'; tripId: string; legId?: string }

export function parse(hash: string): Route {
  const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  switch (p[0]) {
    case 'reports': return { name: 'reports' }
    case 'contacts': return { name: 'contacts' }
    case 'settings': return { name: 'settings' }
    case 'member':
      if (p[1] === 'new') return { name: 'member', role: p[2] === 'accountant' ? 'accountant' : 'driver' }
      if (p[1]) return { name: 'member', memberId: p[1] }
      break
    case 'new': return { name: 'newTrip' }
    case 'trip':
      if (!p[1]) break
      if (p[2] === 'summary') return { name: 'summary', tripId: p[1] }
      if (p[2] === 'expense') return { name: 'addExpense', tripId: p[1], expenseId: p[3] }
      if (p[2] === 'leg') return { name: 'leg', tripId: p[1], legId: p[3] }
      return { name: 'trip', tripId: p[1] }
  }
  return { name: 'home' }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home': return '#/'
    case 'reports': return '#/reports'
    case 'contacts': return '#/contacts'
    case 'settings': return '#/settings'
    case 'member': return r.memberId ? `#/member/${r.memberId}` : `#/member/new/${r.role ?? 'driver'}`
    case 'newTrip': return '#/new'
    case 'trip': return `#/trip/${r.tripId}`
    case 'summary': return `#/trip/${r.tripId}/summary`
    case 'addExpense': return `#/trip/${r.tripId}/expense${r.expenseId ? '/' + r.expenseId : ''}`
    case 'leg': return `#/trip/${r.tripId}/leg${r.legId ? '/' + r.legId : ''}`
  }
}

export function go(r: Route, replace = false) {
  if (replace) location.replace(href(r))
  else location.hash = href(r)
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  return parse(useSyncExternalStore(subscribe, () => location.hash))
}
