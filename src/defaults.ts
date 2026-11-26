import type { BuiltInCategory, Category, RateType, VehicleType } from './types'

export const APP_NAME = 'Trip Manager' // placeholder product name, used in share footers

export const VEHICLE_TYPES: VehicleType[] = ['lorry', 'tipper', 'container', 'pickup', 'tractor', 'bus']
export const RATE_TYPES: RateType[] = ['fixed', 'per_kg', 'per_tonne', 'per_km', 'per_day', 'per_bag']

export const CURRENCY = { code: 'LKR', symbol: 'Rs' }

const GOODS: VehicleType[] = ['lorry', 'tipper', 'container', 'pickup', 'tractor']

/** Which built-in categories each vehicle type starts with. null = every type. */
export const BUILTIN_TYPES: Record<BuiltInCategory, VehicleType[] | null> = {
  fuel: null,
  salary: null,
  bata: null,
  loading: GOODS,
  unloading: GOODS,
  broker: ['lorry', 'tipper', 'container', 'pickup'],
  toll: ['lorry', 'tipper', 'container', 'pickup', 'bus'],
  parking: ['lorry', 'container', 'pickup', 'bus'],
  other: null,
}

export const BUILTINS = Object.keys(BUILTIN_TYPES) as BuiltInCategory[]

export const categoryId = (orgId: string, b: BuiltInCategory) => `${orgId}-cat-${b}`
export const fuelCategoryId = (orgId: string) => categoryId(orgId, 'fuel')

export function defaultCategories(orgId: string): Category[] {
  return BUILTINS.map((b, i) => ({
    id: categoryId(orgId, b),
    orgId,
    builtIn: b,
    name: '',
    hidden: false,
    order: i,
    vehicleTypes: BUILTIN_TYPES[b],
  }))
}
