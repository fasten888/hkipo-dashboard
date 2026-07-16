# Account UI Refactor

## Scope

The account management page now uses the shared dashboard presentation components without
changing its API calls, forms, account calculations, or database behavior.

## Shared components

- `PageHeader`: page title, description, and primary action.
- `StatCard`: account count, cash, frozen funds, and total IPO capacity.
- `SectionCard`: account form, account list, broker profile, and import wizard.
- `MetricCard`: compact account cash, frozen funds, margin, and participation values.

## Visual rules

- The page uses the existing cream dashboard palette and `os-card` surface.
- Primary actions use the existing warm brand color and `rounded-xl` corners.
- Account-only action radius overrides are scoped under `.accounts-page`.
- Responsive grids and all existing interaction behavior are unchanged.

## Data safety

No account fields, API routes, request payloads, calculations, or persistence logic were
modified by this visual refactor.
