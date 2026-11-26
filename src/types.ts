export type Lang = 'en' | 'ta'
export type Role = 'owner' | 'driver' | 'accountant'
export type VehicleType = 'lorry' | 'tipper' | 'container' | 'pickup' | 'tractor' | 'bus'
export type FuelType = 'diesel' | 'petrol'
export type RateType = 'fixed' | 'per_kg' | 'per_tonne' | 'per_km' | 'per_day' | 'per_bag'
export type PaymentStatus = 'unset' | 'due' | 'paid'
export type NumberFormat = 'intl' | 'indian'
export type BuiltInCategory =
  | 'fuel' | 'salary' | 'bata' | 'loading' | 'unloading' | 'broker' | 'toll' | 'parking' | 'other'

/** One business. Every other record carries its orgId (maps to org_id + RLS in Supabase). */
export interface Org {
  id: string
  name: string
  lang: Lang
  numberFormat: NumberFormat
  /** Last price paid per litre, remembered per fuel type */
  fuelPrices: Partial<Record<FuelType, number>>
}

export interface Vehicle {
  id: string
  orgId: string
  regNo: string
  type: VehicleType
  fuel: FuelType
  archived: boolean
}

/** People other than the owner: drivers and accountants/partners. */
export interface Member {
  id: string
  orgId: string
  name: string
  phone: string
  role: Exclude<Role, 'owner'>
  /** Drivers only see these vehicles */
  vehicleIds: string[]
  /** Personal language; falls back to the org's */
  lang: Lang | null
}

export interface Category {
  id: string
  orgId: string
  /** Built-in categories are translated unless the owner renamed them */
  builtIn: BuiltInCategory | null
  /** Owner's own name; '' means use the translated built-in label */
  name: string
  hidden: boolean
  order: number
  /** Vehicle types this category shows for; null = all */
  vehicleTypes: VehicleType[] | null
}

export interface Contact {
  id: string
  orgId: string
  name: string
  kind: 'customer' | 'broker'
  phone: string
}

export interface Leg {
  id: string
  from: string
  to: string
  /** Empty run: no load, no income */
  empty: boolean
  cargo: string
  client: string
  broker: string
  rateType: RateType
  /** kg, tonnes, km, days or bags, depending on rateType; 0 for fixed */
  quantity: number
  /** Price per unit, or the whole hire for fixed */
  rate: number
  /** Computed: fixed → rate, else round(quantity × rate) */
  income: number
  timing: string
  payment: PaymentStatus
  /** memberId of the driver who added it; null = owner */
  createdBy: string | null
}

export interface Expense {
  id: string
  categoryId: string
  amount: number
  /** Fuel only */
  litres?: number
  pricePerLitre?: number
  note: string
  hasReceipt: boolean
  createdAt: string
  createdBy: string | null
}

export interface Trip {
  id: string
  orgId: string
  vehicleId: string
  driverId: string | null
  /** ISO date yyyy-mm-dd */
  startDate: string
  endDate: string | null
  status: 'open' | 'closed'
  distanceKm: number | null
  legs: Leg[]
  expenses: Expense[]
}

/** Vehicle-level spend that doesn't belong to a trip (repairs, accessories…) */
export interface VehicleExpense {
  id: string
  orgId: string
  vehicleId: string
  date: string
  description: string
  amount: number
}

export interface AppState {
  version: 2
  org: Org | null
  vehicles: Vehicle[]
  members: Member[]
  categories: Category[]
  contacts: Contact[]
  trips: Trip[]
  vehicleExpenses: VehicleExpense[]
  currentVehicleId: string | null
  /** Owner previewing the app as one of their members (stand-in for real sign-in) */
  previewMemberId: string | null
}
