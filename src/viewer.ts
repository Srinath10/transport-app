import { useAppState } from './store'
import type { AppState, Lang, Member, Role, Vehicle } from './types'

export interface Viewer {
  role: Role
  member: Member | null
  /** True when the owner is previewing as a member (stand-in until real sign-in) */
  previewing: boolean
  lang: Lang
  /** Income and profit. Drivers never see it. */
  seeMoney: boolean
  /** Add legs, expenses, fuel, receipts */
  canAdd: boolean
  /** Edit or delete existing entries, close trips, mark payments. Owner only (keeps offline sync conflict-free). */
  canEdit: boolean
  canManage: boolean
  canSeeReports: boolean
  vehicles: Vehicle[]
}

export function viewerOf(s: AppState): Viewer {
  const member = s.members.find((m) => m.id === s.previewMemberId) ?? null
  const role: Role = member?.role ?? 'owner'
  const active = s.vehicles.filter((v) => !v.archived)
  const vehicles = role === 'driver' ? active.filter((v) => member!.vehicleIds.includes(v.id)) : active
  return {
    role,
    member,
    previewing: !!member,
    lang: member?.lang ?? s.org?.lang ?? 'en',
    seeMoney: role !== 'driver',
    canAdd: role !== 'accountant',
    canEdit: role === 'owner',
    canManage: role === 'owner',
    canSeeReports: role !== 'driver',
    vehicles,
  }
}

export const useViewer = () => viewerOf(useAppState())

/** The vehicle the viewer is looking at, constrained to what they may see. */
export function useCurrentVehicle(): Vehicle | null {
  const s = useAppState()
  const v = viewerOf(s)
  return v.vehicles.find((x) => x.id === s.currentVehicleId) ?? v.vehicles[0] ?? null
}

/** Drivers only see trips on their vehicles that they drive. */
export const canViewTrip = (v: Viewer, trip: { vehicleId: string; driverId: string | null }) =>
  v.role !== 'driver' || (v.vehicles.some((x) => x.id === trip.vehicleId) && trip.driverId === v.member?.id)
