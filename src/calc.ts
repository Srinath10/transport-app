import type { Leg, RateType, Trip } from './types'
import { fuelCategoryId } from './defaults'

export interface TripTotals {
  income: number
  expenses: number
  profit: number
  litres: number
  fuelCost: number
  /** km per litre, null if unknown */
  mileage: number | null
  emptyLegs: number
}

export function tripTotals(trip: Trip): TripTotals {
  const income = trip.legs.reduce((s, l) => s + (l.empty ? 0 : l.income), 0)
  const expenses = trip.expenses.reduce((s, e) => s + e.amount, 0)
  const fuelId = fuelCategoryId(trip.orgId)
  const fuel = trip.expenses.filter((e) => e.categoryId === fuelId)
  const litres = fuel.reduce((s, e) => s + (e.litres ?? 0), 0)
  const fuelCost = fuel.reduce((s, e) => s + e.amount, 0)
  const mileage = trip.distanceKm && litres > 0 ? trip.distanceKm / litres : null
  return { income, expenses, profit: income - expenses, litres, fuelCost, mileage, emptyLegs: trip.legs.filter((l) => l.empty).length }
}

export const legIncome = (rateType: RateType, quantity: number, rate: number) =>
  rateType === 'fixed' ? Math.round(rate) : Math.round(quantity * rate)

/**
 * Splits a trip's expenses across its loaded legs by income share, so per-customer
 * and per-route profit add up to the trip's profit. Empty legs carry no cost of their
 * own; their fuel is paid for by the loads on that trip.
 */
export function legProfits(trip: Trip): { leg: Leg; income: number; cost: number; profit: number }[] {
  const t = tripTotals(trip)
  return trip.legs.filter((l) => !l.empty).map((leg) => {
    const share = t.income > 0 ? leg.income / t.income : 0
    const cost = t.expenses * share
    return { leg, income: leg.income, cost, profit: leg.income - cost }
  })
}

export function routeLabel(trip: Trip): string {
  if (trip.legs.length === 0) return ''
  return [trip.legs[0].from, ...trip.legs.map((l) => l.to)].join(' → ')
}

export const monthKey = (iso: string) => iso.slice(0, 7)

export const todayISO = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
