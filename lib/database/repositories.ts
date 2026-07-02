export const databaseModules = {
  ipo: 'IPO',
  ipoEvent: 'IPO_EVENT',
  account: 'ACCOUNT',
  accountIpo: 'ACCOUNT_IPO',
  ipoAnalysis: 'IPO_ANALYSIS',
} as const

export function assertDatabaseBackedRoute(moduleName: keyof typeof databaseModules) {
  return {
    module: databaseModules[moduleName],
    source: 'database',
    ready: false,
  }
}
