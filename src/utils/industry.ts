const LEGACY_INDUSTRY_MAP: Record<string, string> = {
  AI: 'AI',
  机器人: '机器人',
  芯片: '半导体',
  医疗: '医药',
  消费: '消费',
  SaaS: 'SaaS',
  新能源: '新能源',
  其它: '其它',
}

export const COMMON_INDUSTRIES = [
  '医药',
  'AI',
  '机器人',
  '半导体',
  '消费',
  '新能源',
  '金融',
  '其它',
] as const

export function normalizeIndustry(
  industry: unknown,
  legacyTags?: unknown,
) {
  if (typeof industry === 'string' && industry.trim()) {
    return industry.trim().slice(0, 50)
  }
  if (!Array.isArray(legacyTags)) return ''
  const migrated = legacyTags
    .filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim()))
    .map((tag) => LEGACY_INDUSTRY_MAP[tag.trim()] ?? tag.trim())
  return [...new Set(migrated)].join('、').slice(0, 50)
}

export function legacyIndustryValue(value: string) {
  return LEGACY_INDUSTRY_MAP[value.trim()] ?? value.trim()
}
