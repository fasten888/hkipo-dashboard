# HKIPO OS Data Provider Platform

## Goal

The Provider Platform is the data foundation for HKIPO OS. Every future data source should enter the system through one provider contract, then flow through normalization, validation, merge, diff, upsert, and logging.

Business pages should not care whether a field came from HKEX, AAStocks, Futu, Bright Smart, Tiger, AI, or another source. They should only read the database.

## Directory Layout

```text
lib/providers/
  core/
    dataHealth.ts
    manager.ts
    mergeEngine.ts
    provider.ts
  shared/
    types.ts
  hkex/
  aastocks/
  futu/
  bright/
  tiger/
```

## Provider Domains

The platform is designed for these long-lived domains:

- IPO
- Broker
- Account
- History
- Market
- News
- AI

New domains can be added in `ProviderDomain` without changing page-level code.

## Provider Tiers

Providers are ranked by trust level:

1. Official
2. Broker
3. Market
4. Community
5. AI

The default priority values live in `PROVIDER_PRIORITY`.

## Field Source

Every merged field can carry source metadata:

- provider id
- provider name
- tier
- priority
- source URL
- fetched time
- confidence

Example:

```ts
{
  code: '09630',
  lotAmount: 4282.7,
}
```

Can produce field sources such as:

```ts
{
  code: { providerName: 'HKEX', tier: 'official' },
  lotAmount: { providerName: 'AAStocks', tier: 'market' },
}
```

This lets the database keep one canonical IPO record while still knowing where each field came from.

## Merge Rule

Merge is field-level, not record-level.

If HKEX provides `sponsor` and Futu provides `marginMultiple`, both fields can coexist on the same IPO record. A provider never blindly overwrites an entire IPO object.

When two providers return the same field:

1. Higher priority wins.
2. If priority is equal, newer fetched time wins.
3. Empty values never overwrite useful values.

## Provider Status

Each provider tracks:

- last sync
- duration
- status
- success count
- failed count
- item count
- version
- message

This can power future Sync, Health, and Admin views without changing the provider contract.

## Data Health

Data Health calculates coverage by domain and source tier.

Example:

- IPO official coverage: 92%
- IPO market coverage: 8%
- Broker coverage: 100%

This is useful for knowing whether a page is mostly official data, broker data, or AI-derived data.
