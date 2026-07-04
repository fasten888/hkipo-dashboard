# Provider Sync Flow

## Full Flow

```text
Provider
  ↓
Fetch
  ↓
Parse
  ↓
Normalize
  ↓
Validate
  ↓
Merge
  ↓
Diff
  ↓
Upsert
  ↓
Log
```

## Stage Responsibilities

### Fetch

Fetch raw data from the provider source.

Sprint 11 does not add real fetching. Future providers will implement this stage inside their own directory.

### Parse

Convert provider-specific payloads into provider-specific records.

Examples:

- HTML rows
- JSON payloads
- CSV lines
- broker API responses

### Normalize

Convert provider-specific records into platform records:

- `IPORecord`
- `BrokerRecord`
- `NewsRecord`
- `MarketRecord`

Normalize must not write to the database.

### Validate

Validate required fields, dates, numbers, stock codes, and status values.

The existing IPO pipeline already owns IPO validation logic.

### Merge

Merge fields from multiple providers.

Example:

```text
HKEX       → code, name, sponsor, listing date
AAStocks   → lot amount
Futu       → margin multiple
AI         → recommendation
```

The merged IPO remains one canonical database record.

### Diff

Compare merged provider data with the current database state.

Outputs:

- added
- updated
- skipped
- deleted candidates

### Upsert

Write changes in a transaction.

The database remains the single source of truth.

### Log

Write sync status to `SYNC_LOG`.

Provider status can also be displayed from the manager:

- last sync
- duration
- added
- updated
- failed
- message

## Extension Rule

To add a new provider later:

1. Add a directory under `lib/providers/{providerName}`.
2. Implement the `Provider` interface.
3. Register it with `ProviderManager`.
4. Reuse the existing pipeline stages.

No business page should import a provider directly.
