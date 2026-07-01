import { DashboardPage as DashboardFeature } from '../features/dashboard/DashboardPage'
import type { DashboardFilter } from '../types/dashboardFilter'

export function DashboardPage({ filter }: { filter: DashboardFilter }) {
  return <DashboardFeature filter={filter} />
}
