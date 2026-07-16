# Safe Recovery Plan

## Guardrails

- Insert only. No `truncate`, `delete`, `replace`, or update of existing business rows.
- Match IPOs by normalized stock code.
- Match accounts by ID, then account name plus suffix.
- Match subscriptions by ID and by `(accountId, ipoId)`.
- Match sell records by ID and by transaction signature.
- Run the entire apply phase in one PostgreSQL transaction.

## Procedure

1. Preserve a pre-recovery database export outside Git.
2. Preview the exact delta:

   ```bash
   npx tsx scripts/recover-missing-data.ts --dry-run
   ```

3. Confirm the planned IPO, subscription, and sell-record counts.
4. Apply the inserts:

   ```bash
   npx tsx scripts/recover-missing-data.ts --apply
   ```

5. Run dry-run again. All three planned insert counts must be zero.
6. Verify Prisma counts and manually inspect the seven named IPOs.

The source defaults to `recovery/HKIPO_LIVE_BROWSER_20260714.json`. A different source may be
passed as the first positional argument.
