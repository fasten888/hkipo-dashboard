import type {
  DiffEngine,
  ExistingIpoSnapshot,
  Fetcher,
  Normalizer,
  Parser,
  PipelineLogStore,
  PipelineRunResult,
  UpsertEngine,
  Validator,
} from './types'

export type PipelineDependencies = {
  provider: string
  fetcher: Fetcher
  parser: Parser
  normalizer: Normalizer
  validator: Validator<Awaited<ReturnType<Normalizer['normalize']>>[number]>
  diffEngine: DiffEngine
  upsertEngine: UpsertEngine
  logStore: PipelineLogStore
  loadExisting: () => Promise<ExistingIpoSnapshot[]>
}

export async function runIpoPipeline(
  dependencies: PipelineDependencies,
): Promise<PipelineRunResult> {
  const startedAt = new Date()

  try {
    const raw = await dependencies.fetcher.fetch()
    const parsed = await dependencies.parser.parse(raw)
    const normalized = await dependencies.normalizer.normalize(parsed)
    const validation = dependencies.validator.validate(normalized)
    const existing = await dependencies.loadExisting()
    const diff = dependencies.diffEngine.diff(existing, validation.valid)
    const upsert = await dependencies.upsertEngine.upsert(diff)
    const endedAt = new Date()

    const result: PipelineRunResult = {
      provider: dependencies.provider,
      startedAt,
      endedAt,
      added: upsert.added,
      updated: upsert.updated,
      skipped: upsert.skipped,
      deleted: upsert.deleted,
      failed: upsert.failed + validation.invalid.length,
      message: [upsert.message, createValidationMessage(validation.invalid.length)]
        .filter(Boolean)
        .join(' '),
    }

    await dependencies.logStore.write(result)

    return result
  } catch (error) {
    const endedAt = new Date()
    const result: PipelineRunResult = {
      provider: dependencies.provider,
      startedAt,
      endedAt,
      added: 0,
      updated: 0,
      skipped: 0,
      deleted: 0,
      failed: 1,
      message: error instanceof Error ? error.message : 'Unknown pipeline error.',
    }

    await dependencies.logStore.write(result)

    return result
  }
}

function createValidationMessage(invalidCount: number) {
  return invalidCount > 0 ? `${invalidCount} invalid records skipped.` : ''
}
