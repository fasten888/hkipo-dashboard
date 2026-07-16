# Final Repair Report

## 1. Recovered data

The newest complete source was recovered from the production browser LocalStorage snapshot
generated on 2026-07-14. A PostgreSQL backup was created before applying any inserts.

| Model | Before | Inserted | After |
| --- | ---: | ---: | ---: |
| Account | 12 | 0 | 12 |
| IPO | 112 | 4 | 116 |
| Account IPO | 163 | 250 | 413 |
| Sell record | 24 | 52 | 76 |

The recovery was insert-only and transactional. A second dry-run reported zero missing IPOs,
subscriptions, and sell records, confirming that the script is repeatable.

## 2. Cache repair

- Service-worker cache version upgraded to `v8`.
- All `/api/*` requests now use network-only fetches with `cache: no-store`.
- Activation deletes older cache versions.
- `npm run clear-sw-cache` opens a same-origin utility that unregisters service workers and
  clears Cache Storage when a manual reset is required.

No browser cache was silently deleted during development. The new worker clears old caches
when the repaired version is deployed and activated.

## 3. Provider and IPO names

- IPO records now support separate `displayNameCn` and `displayNameEn` fields.
- HKEX synchronization preserves an existing Chinese name when an incoming record is English.
- App data, dashboard, planner, and IPO APIs prefer the Chinese display name.
- Existing names were backfilled without replacing the canonical provider value.

## 4. Account page

The account page now uses `PageHeader`, `StatCard`, `SectionCard`, and `MetricCard`. Its API,
forms, calculations, imports, and account operations remain unchanged. Details are documented
in `ACCOUNT_UI_REFACTOR.md`.

## 5. Verification

Run the following checks after deployment:

```bash
npx tsx scripts/recover-missing-data.ts --dry-run
npx tsx scripts/backfill-ipo-display-names.ts
npm run build
npm run lint
```

Expected recovery dry-run result:

```text
New IPOs: 0
New subscriptions: 0
New sell records: 0
```

For a device still showing stale records, visit `/clear-sw-cache.html` once and reopen the app.
