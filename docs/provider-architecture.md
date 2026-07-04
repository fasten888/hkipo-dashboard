# Provider Architecture

## Contract

Every provider implements the same interface:

```ts
interface Provider<TPayload, TParsed, TRecord> {
  id: string
  name: string
  domain: ProviderDomain
  tier: ProviderTier
  priority: number
  enabled: boolean
  version: string

  fetch(context: SyncContext): Promise<ProviderFetchResult<TPayload>>
  parse(payload: ProviderFetchResult<TPayload>, context: SyncContext): Promise<ProviderResult<TParsed>>
  normalize(parsed: ProviderResult<TParsed>, context: SyncContext): Promise<ProviderResult<TRecord>>
}
```

## Provider Manager

`ProviderManager` is responsible for:

- registering providers
- unregistering providers
- enabling providers
- disabling providers
- sorting by priority
- running one provider
- running all providers
- tracking provider status

Business services should call the manager instead of directly invoking provider implementations.

## Provider Registration

Future providers should live in their own directory:

```text
lib/providers/hkex/
lib/providers/futu/
lib/providers/aastocks/
```

Each provider should export a factory or provider object from its own `index.ts`.

Example:

```ts
providerManager.registerProvider(hkexIpoProvider)
providerManager.registerProvider(futuMarginProvider)
providerManager.registerProvider(aastocksMarketProvider)
```

## Merge Engine

`mergeRecord` accepts one incoming record plus provider metadata. It returns:

- merged data
- field source map
- updated fields
- skipped fields

`mergeRecordsByKey` groups incoming records by a stable key such as IPO code.

For IPO records, the key should usually be:

```ts
record.code
```

## Data Health

`createDataHealthReport` accepts expected fields and a source map, then reports coverage.

This is intentionally generic. It can be used for IPO, Broker, Market, News, or AI data.

## Relationship With Existing Pipeline

The current Sync Pipeline remains in `lib/sync/pipeline`.

The Provider Platform sits one level above it:

- Provider Platform defines how data sources are structured.
- Existing Pipeline defines how normalized IPO data is validated, diffed, and upserted.

No existing Dashboard, Planner, Account, Detail, or API code needs to change for Sprint 11.
