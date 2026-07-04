import type {
  ProviderDescriptor,
  ProviderFetchResult,
  ProviderResult,
  SyncContext,
} from '../shared'

export interface Provider<TPayload = unknown, TParsed = unknown, TRecord = unknown>
  extends ProviderDescriptor {
  fetch(context: SyncContext): Promise<ProviderFetchResult<TPayload>>
  parse(payload: ProviderFetchResult<TPayload>, context: SyncContext): Promise<ProviderResult<TParsed>>
  normalize(parsed: ProviderResult<TParsed>, context: SyncContext): Promise<ProviderResult<TRecord>>
}
