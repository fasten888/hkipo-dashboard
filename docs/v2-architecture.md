# HKIPO OS V2 Architecture

V2 will move the product toward a data-driven architecture where the database is
the single source of truth.

## Runtime Strategy

The current production app remains on Vite while V2 is introduced in small,
safe increments. The new `app/`, `components/`, and `lib/` directories reserve
the Next.js 15 structure without breaking the stable product.

## Database

The first V2 schema increment adds:

- `IPO`
- `IPO_EVENT`
- `ACCOUNT`
- `ACCOUNT_IPO`
- `IPO_ANALYSIS`

`IPO_ANALYSIS` is the only table intended for manual qualitative input.

## Data Rule

Future V2 pages should read from the database through repository functions or
route handlers. External data sync belongs in `lib/sync` and should write to the
database before any page renders it.

## Migration Order

1. Database schema and contracts.
2. Next.js app shell and route handlers.
3. Dashboard database reads.
4. IPO database reads.
5. Calculator account-aware reads.
6. Accounts and history aggregation.
7. HKEX sync jobs.
