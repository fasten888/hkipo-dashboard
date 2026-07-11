import type {
  DataHealthReport,
  FieldSourceMap,
  ProviderDomain,
  ProviderTier,
} from '../shared/index.js'

export type DataHealthInput = {
  domain: ProviderDomain
  expectedFields: string[]
  sources: FieldSourceMap
}

export function createDataHealthReport(inputs: DataHealthInput[]): DataHealthReport {
  return {
    generatedAt: new Date(),
    metrics: inputs.map((input) => {
      const sourcedFields = input.expectedFields.filter((field) => input.sources[field])
      const byTier = sourcedFields.reduce<Partial<Record<ProviderTier, number>>>((acc, field) => {
        const tier = input.sources[field]?.tier
        if (tier) {
          acc[tier] = (acc[tier] ?? 0) + 1
        }
        return acc
      }, {})

      return {
        domain: input.domain,
        totalFields: input.expectedFields.length,
        sourcedFields: sourcedFields.length,
        coveragePercent:
          input.expectedFields.length === 0
            ? 0
            : Number(((sourcedFields.length / input.expectedFields.length) * 100).toFixed(1)),
        byTier,
      }
    }),
  }
}
