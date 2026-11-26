import { useSyncExternalStore } from 'react'
import type {
  AppState, Category, Contact, Expense, FuelType, Lang, Leg, Member, Org, Trip, Vehicle, VehicleExpense, VehicleType,
} from './types'
import { categoryId, defaultCategories, fuelCategoryId } from './defaults'
import { todayISO } from './calc'

const KEY = 'trip-manager/v2'
const KEY_V1 = 'karikalan-transport/v1'

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const empty = (): AppState => ({
  version: 2, org: null, vehicles: [], members: [], categories: [], contacts: [],
  trips: [], vehicleExpenses: [], currentVehicleId: null, previewMemberId: null,
})

// ---------- migration from the single-lorry v1 app ----------
interface V1Leg { id: string; from: string; to: string; empty: boolean; cargo: string; client: string; viaBroker: boolean; income: number; timing: string; payment: Leg['payment'] }
interface V1Expense { id: string; category: string; amount: number; litres?: number; pricePerLitre?: number; note: string; hasReceipt: boolean; createdAt: string }
interface V1Trip { id: string; lorryId: string; driverName: string; startDate: string; endDate: string | null; status: 'open' | 'closed'; distanceKm: number | null; legs: V1Leg[]; expenses: V1Expense[] }
interface V1 { version: 1; lorries: { id: string; plate: string }[]; currentLorryId: string; trips: V1Trip[]; lorryExpenses: { id: string; lorryId: string; date: string; description: string; amount: number }[] }

function migrateV1(v1: V1): AppState {
  const orgId = 'org-' + uid()
  const members: Member[] = []
  const driverId = (name: string) => {
    if (!name) return null
    let m = members.find((x) => x.name === name)
    if (!m) { m = { id: uid(), orgId, name, phone: '', role: 'driver', vehicleIds: [], lang: null }; members.push(m) }
    return m.id
  }
  const contacts: Contact[] = []
  const contact = (name: string, kind: Contact['kind']) => {
    if (name && !contacts.some((c) => c.name === name && c.kind === kind)) contacts.push({ id: uid(), orgId, name, kind, phone: '' })
  }
  const lastDiesel = v1.trips.flatMap((t) => t.expenses).find((e) => e.pricePerLitre)?.pricePerLitre
  const trips: Trip[] = v1.trips.map((t) => {
    const did = driverId(t.driverName)
    const m = members.find((x) => x.id === did)
    if (m && !m.vehicleIds.includes(t.lorryId)) m.vehicleIds.push(t.lorryId)
    return {
      id: t.id, orgId, vehicleId: t.lorryId, driverId: did, startDate: t.startDate, endDate: t.endDate,
      status: t.status, distanceKm: t.distanceKm,
      legs: t.legs.map((l) => {
        contact(l.client, 'customer')
        if (l.viaBroker) contact('Broker', 'broker')
        return {
          id: l.id, from: l.from, to: l.to, empty: l.empty, cargo: l.cargo, client: l.client,
          broker: l.viaBroker ? 'Broker' : '', rateType: 'fixed', quantity: 0, rate: l.income, income: l.income,
          timing: l.timing, payment: l.payment, createdBy: null,
        }
      }),
      expenses: t.expenses.map((e) => ({
        id: e.id, categoryId: categoryId(orgId, e.category === 'diesel' ? 'fuel' : (e.category as Category['builtIn'] & string)),
        amount: e.amount, litres: e.litres, pricePerLitre: e.pricePerLitre, note: e.note,
        hasReceipt: e.hasReceipt, createdAt: e.createdAt, createdBy: null,
      })),
    }
  })
  return {
    version: 2,
    org: { id: orgId, name: 'Karikalan Transport', lang: 'en', numberFormat: 'intl', fuelPrices: lastDiesel ? { diesel: lastDiesel } : {} },
    vehicles: v1.lorries.map((l) => ({ id: l.id, orgId, regNo: l.plate, type: 'lorry', fuel: 'diesel', archived: false })),
    members,
    categories: defaultCategories(orgId),
    contacts,
    trips,
    vehicleExpenses: v1.lorryExpenses.map((x) => ({ id: x.id, orgId, vehicleId: x.lorryId, date: x.date, description: x.description, amount: x.amount })),
    currentVehicleId: v1.currentLorryId,
    previewMemberId: null,
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as AppState
      if (s.version === 2) return s
    }
    const old = localStorage.getItem(KEY_V1)
    if (old) {
      const v1 = JSON.parse(old) as V1
      if (v1.version === 1) {
        const s = migrateV1(v1)
        localStorage.setItem(KEY, JSON.stringify(s))
        return s
      }
    }
  } catch {
    /* fall through */
  }
  return empty()
}

let state: AppState = load()
const listeners = new Set<() => void>()

function commit(next: AppState) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full: keep in memory */ }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export const useAppState = (): AppState => useSyncExternalStore(subscribe, () => state)
export const getState = () => state

const orgId = () => state.org!.id
const mapTrip = (tripId: string, fn: (t: Trip) => Trip) =>
  commit({ ...state, trips: state.trips.map((t) => (t.id === tripId ? fn(t) : t)) })

function withContacts(s: AppState, leg: Leg): Contact[] {
  const out = [...s.contacts]
  const add = (name: string, kind: Contact['kind']) => {
    const n = name.trim()
    if (n && !out.some((c) => c.kind === kind && c.name.toLowerCase() === n.toLowerCase()))
      out.push({ id: uid(), orgId: s.org!.id, name: n, kind, phone: '' })
  }
  if (!leg.empty) { add(leg.client, 'customer'); add(leg.broker, 'broker') }
  return out
}

export const actions = {
  // ---------- onboarding & org ----------
  completeOnboarding(input: {
    name: string; lang: Lang
    vehicle: { regNo: string; type: VehicleType; fuel: FuelType }
    driver: { name: string; phone: string } | null
  }) {
    const id = 'org-' + uid()
    const vehicle: Vehicle = { id: uid(), orgId: id, ...input.vehicle, archived: false }
    const members: Member[] = input.driver
      ? [{ id: uid(), orgId: id, ...input.driver, role: 'driver', vehicleIds: [vehicle.id], lang: null }]
      : []
    commit({
      ...empty(),
      org: { id, name: input.name, lang: input.lang, numberFormat: 'intl', fuelPrices: {} },
      vehicles: [vehicle],
      members,
      categories: defaultCategories(id),
      currentVehicleId: vehicle.id,
    })
  },
  updateOrg(patch: Partial<Omit<Org, 'id'>>) {
    commit({ ...state, org: { ...state.org!, ...patch } })
  },
  eraseAll() {
    commit(empty())
  },

  // ---------- vehicles ----------
  selectVehicle(id: string) { commit({ ...state, currentVehicleId: id }) },
  addVehicle(v: { regNo: string; type: VehicleType; fuel: FuelType }) {
    const id = uid()
    commit({ ...state, vehicles: [...state.vehicles, { id, orgId: orgId(), ...v, archived: false }], currentVehicleId: id })
    return id
  },
  updateVehicle(id: string, patch: Partial<Omit<Vehicle, 'id' | 'orgId'>>) {
    commit({ ...state, vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) })
  },

  // ---------- people ----------
  addMember(m: Omit<Member, 'id' | 'orgId'>) {
    const id = uid()
    commit({ ...state, members: [...state.members, { ...m, id, orgId: orgId() }] })
    return id
  },
  updateMember(id: string, patch: Partial<Omit<Member, 'id' | 'orgId'>>) {
    commit({ ...state, members: state.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
  },
  removeMember(id: string) {
    commit({
      ...state,
      members: state.members.filter((m) => m.id !== id),
      previewMemberId: state.previewMemberId === id ? null : state.previewMemberId,
    })
  },
  setPreview(memberId: string | null) { commit({ ...state, previewMemberId: memberId }) },
  setMyLang(lang: Lang) {
    const pid = state.previewMemberId
    if (pid) actions.updateMember(pid, { lang })
    else actions.updateOrg({ lang })
  },

  // ---------- categories ----------
  renameCategory(id: string, name: string) {
    commit({ ...state, categories: state.categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)) })
  },
  toggleCategory(id: string) {
    commit({ ...state, categories: state.categories.map((c) => (c.id === id ? { ...c, hidden: !c.hidden } : c)) })
  },
  addCategory(name: string) {
    const order = Math.max(-1, ...state.categories.map((c) => c.order)) + 1
    commit({ ...state, categories: [...state.categories, { id: uid(), orgId: orgId(), builtIn: null, name: name.trim(), hidden: false, order, vehicleTypes: null }] })
  },
  moveCategory(id: string, dir: -1 | 1) {
    const list = [...state.categories].sort((a, b) => a.order - b.order)
    const i = list.findIndex((c) => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    commit({ ...state, categories: list.map((c, k) => ({ ...c, order: k })) })
  },

  // ---------- contacts ----------
  updateContact(id: string, patch: Partial<Pick<Contact, 'phone' | 'name'>>) {
    commit({ ...state, contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  },

  // ---------- trips ----------
  startTrip(input: { vehicleId: string; driverId: string | null; startDate: string }): string {
    const trip: Trip = {
      id: uid(), orgId: orgId(), ...input, endDate: null, status: 'open', distanceKm: null, legs: [], expenses: [],
    }
    commit({ ...state, trips: [trip, ...state.trips] })
    return trip.id
  },
  updateTrip(tripId: string, patch: Partial<Pick<Trip, 'driverId' | 'distanceKm' | 'startDate' | 'endDate'>>) {
    mapTrip(tripId, (t) => ({ ...t, ...patch }))
  },
  closeTrip(tripId: string) {
    mapTrip(tripId, (t) => ({ ...t, status: 'closed', endDate: t.endDate ?? todayISO() }))
  },
  reopenTrip(tripId: string) { mapTrip(tripId, (t) => ({ ...t, status: 'open' })) },
  deleteTrip(tripId: string) { commit({ ...state, trips: state.trips.filter((t) => t.id !== tripId) }) },

  saveLeg(tripId: string, leg: Leg) {
    const contacts = withContacts(state, leg)
    commit({
      ...state,
      contacts,
      trips: state.trips.map((t) =>
        t.id !== tripId ? t : {
          ...t,
          legs: t.legs.some((l) => l.id === leg.id) ? t.legs.map((l) => (l.id === leg.id ? leg : l)) : [...t.legs, leg],
        }),
    })
  },
  deleteLeg(tripId: string, legId: string) {
    mapTrip(tripId, (t) => ({ ...t, legs: t.legs.filter((l) => l.id !== legId) }))
  },
  cyclePayment(tripId: string, legId: string) {
    const order = ['unset', 'due', 'paid'] as const
    mapTrip(tripId, (t) => ({
      ...t,
      legs: t.legs.map((l) => (l.id === legId ? { ...l, payment: order[(order.indexOf(l.payment) + 1) % 3] } : l)),
    }))
  },
  markPaid(legIds: string[]) {
    const ids = new Set(legIds)
    commit({ ...state, trips: state.trips.map((t) => ({ ...t, legs: t.legs.map((l) => (ids.has(l.id) ? { ...l, payment: 'paid' } : l)) })) })
  },

  saveExpense(tripId: string, expense: Expense) {
    const trip = state.trips.find((t) => t.id === tripId)
    const vehicle = state.vehicles.find((v) => v.id === trip?.vehicleId)
    let org = state.org!
    if (vehicle && expense.categoryId === fuelCategoryId(org.id) && expense.pricePerLitre)
      org = { ...org, fuelPrices: { ...org.fuelPrices, [vehicle.fuel]: expense.pricePerLitre } }
    commit({
      ...state,
      org,
      trips: state.trips.map((t) =>
        t.id !== tripId ? t : {
          ...t,
          expenses: t.expenses.some((e) => e.id === expense.id)
            ? t.expenses.map((e) => (e.id === expense.id ? expense : e))
            : [...t.expenses, expense],
        }),
    })
  },
  deleteExpense(tripId: string, expenseId: string) {
    mapTrip(tripId, (t) => ({ ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) }))
  },
  addVehicleExpense(x: Omit<VehicleExpense, 'id' | 'orgId'>) {
    commit({ ...state, vehicleExpenses: [...state.vehicleExpenses, { ...x, id: uid(), orgId: orgId() }] })
  },
}
