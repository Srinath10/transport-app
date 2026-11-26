import { useEffect } from 'react'
import { useRoute } from './router'
import { useAppState } from './store'
import { useT } from './i18n'
import { PreviewBanner } from './ui'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { TripDetail } from './screens/TripDetail'
import { AddExpense } from './screens/AddExpense'
import { LegForm } from './screens/LegForm'
import { NewTrip } from './screens/NewTrip'
import { TripSummary } from './screens/TripSummary'
import { Reports } from './screens/Reports'
import { Contacts } from './screens/Contacts'
import { Settings } from './screens/Settings'
import { MemberForm } from './screens/MemberForm'

export default function App() {
  const s = useAppState()
  const r = useRoute()
  const { lang } = useT()
  const key = JSON.stringify(r)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [key])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  if (!s.org) return <div className="app"><Onboarding /></div>

  let screen
  switch (r.name) {
    case 'home': screen = <Home />; break
    case 'reports': screen = <Reports />; break
    case 'contacts': screen = <Contacts />; break
    case 'settings': screen = <Settings />; break
    case 'member': screen = <MemberForm memberId={r.memberId} role={r.role} />; break
    case 'newTrip': screen = <NewTrip />; break
    case 'trip': screen = <TripDetail tripId={r.tripId} />; break
    case 'summary': screen = <TripSummary tripId={r.tripId} />; break
    case 'addExpense': screen = <AddExpense tripId={r.tripId} expenseId={r.expenseId} />; break
    case 'leg': screen = <LegForm tripId={r.tripId} legId={r.legId} />; break
  }
  // key remounts forms when the route (or who's viewing) changes, so state never leaks between screens
  return (
    <div className="app" key={key + (s.previewMemberId ?? '')}>
      <PreviewBanner />
      {screen}
    </div>
  )
}
