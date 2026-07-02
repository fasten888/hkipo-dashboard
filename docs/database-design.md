# IPO Master Database Design

Status: proposal for Sprint 4.

This document defines the professional-grade data model for Hong Kong IPO OS V2.
It is intentionally written before implementation. No HKEX provider, crawler, or
page logic should be built until this design is confirmed.

## Design Goals

- Database is the single source of truth.
- Official IPO facts are separated from account actions, market performance,
  user decisions, AI analysis, and provider metadata.
- Every provider writes through sync services and source records.
- Tables are append-friendly where historical audit matters.
- Mutable fields are isolated so official history is not accidentally rewritten.
- The model must support HKEX, broker data, dark pool data, AI analysis,
  financing, accounts, subscriptions, allotment, sales, and historical returns.

## Source Classification

| Source | Meaning | Examples |
| --- | --- | --- |
| Official | Published by HKEX or issuer documents | stock code, timetable, offer price, lot size |
| Broker | Data from Futu, Bright Smart, Phillip, Yaocai, etc. | margin multiple, financing fee, broker status |
| Market | Trading result after listing | dark price, open price, close price |
| User | Personal account and trading records | account apply lots, commission, sell price |
| AI | Generated analysis, ranking, risk, recommendation | rating, expected dark return, risk note |
| System | Internal sync and audit metadata | sync status, provider payload hash |

## Tables

## 1. `ipo`

Canonical IPO identity. One row per listed or listing candidate security.

### Responsibility

- Stable master identity.
- Human-readable stock name and stock code.
- Current lifecycle status.
- Basic classification.

### Key Fields

- `id`
- `code`
- `name`
- `name_en`
- `status`
- `board`
- `industry`
- `sector`
- `issuer`
- `sponsor`
- `created_at`
- `updated_at`

### Update Policy

- `code`: permanent once assigned.
- `name`: official source can update before listing; preserve changes via source snapshots.
- `status`: mutable, because IPO moves from hearing to subscription, allotment, listed, withdrawn.
- `industry` / `sector`: mutable, but should track source and manual override if needed.

### Source

Mostly official. `industry` can be official, provider, or user-normalized.

## 2. `ipo_timeline`

All important IPO dates and events.

### Responsibility

- Timetable history and event calendar.
- Supports multiple event types without altering `ipo`.

### Event Types

- `hearing`
- `prospectus`
- `subscription_start`
- `subscription_end`
- `pricing`
- `allotment`
- `refund`
- `dark_trading`
- `listing`
- `withdrawn`

### Key Fields

- `id`
- `ipo_id`
- `type`
- `title`
- `event_at`
- `timezone`
- `source_id`
- `is_confirmed`
- `created_at`

### Update Policy

- Prefer append over overwrite when a timetable changes.
- If an official correction happens, mark the previous row as superseded in a future `superseded_by_id` field.

### Source

Official and broker.

## 3. `ipo_subscription`

Official subscription terms for the IPO, not personal account applications.

### Responsibility

- Offer range, final price, lot size, entry amount, subscription period.
- Captures public offer / international placing level facts.

### Key Fields

- `id`
- `ipo_id`
- `offer_price_min`
- `offer_price_max`
- `final_offer_price`
- `lot_size`
- `lot_amount`
- `public_offer_shares`
- `international_offer_shares`
- `minimum_apply_lots`
- `currency`
- `source_id`
- `created_at`
- `updated_at`

### Update Policy

- Offer range can update before prospectus finalization.
- `final_offer_price` is permanent after official pricing unless corrected by official source.
- Historical values should be traceable through `ipo_source`.

### Source

Official.

## 4. `ipo_margin`

Broker financing and margin rules for an IPO.

### Responsibility

- Margin multiples and financing terms vary by broker and can change over time.
- Separates broker-specific rules from official IPO facts.

### Key Fields

- `id`
- `ipo_id`
- `broker`
- `currency`
- `margin_multiple`
- `cash_required_rate`
- `annual_rate`
- `handling_fee`
- `financing_start_at`
- `financing_end_at`
- `max_financing_amount`
- `source_id`
- `created_at`
- `updated_at`

### Update Policy

- Mutable until subscription ends.
- Keep provider source snapshots so later changes can be audited.

### Source

Broker.

## 5. `ipo_performance`

Market performance after pricing, dark trading, and listing.

### Responsibility

- Separates market result from official subscription terms.
- Enables dark pool, first day, holding return analysis.

### Key Fields

- `id`
- `ipo_id`
- `final_offer_price`
- `dark_open_price`
- `dark_close_price`
- `listing_open_price`
- `listing_close_price`
- `first_day_high`
- `first_day_low`
- `first_day_volume`
- `dark_return_rate`
- `first_day_return_rate`
- `source_id`
- `created_at`
- `updated_at`

### Update Policy

- Market prices can be corrected by provider, but each source should remain traceable.
- Derived return rates can be recalculated.

### Source

Market and broker.

## 6. `ipo_analysis`

Human and AI analysis layer. This is the only intentional non-official IPO table.

### Responsibility

- Ratings, recommendations, risk, and notes.
- Supports AI analysis and manual override.

### Key Fields

- `id`
- `ipo_id`
- `analysis_type`
- `rating`
- `recommendation`
- `risk_level`
- `expected_dark_return`
- `expected_first_day_return`
- `summary`
- `note`
- `model`
- `created_by`
- `created_at`
- `updated_at`

### Update Policy

- Mutable.
- AI rows should keep `model`.
- User rows should keep `created_by = user`.

### Source

AI and user.

## 7. `ipo_source`

Provider source snapshots and provenance.

### Responsibility

- Records where data came from.
- Enables debugging sync differences across HKEX, Futu, Yaocai, Phillip, Bright Smart.

### Key Fields

- `id`
- `ipo_id`
- `provider`
- `source_type`
- `source_url`
- `pdf_url`
- `external_id`
- `payload_hash`
- `raw_payload`
- `fetched_at`
- `created_at`

### Update Policy

- Append-only.
- Never overwrite `raw_payload`; store a new row when source changes.

### Source

System/provider.

## 8. `account`

Personal account master data.

### Responsibility

- Account identity, broker, currency, and capital state.
- Does not store IPO-specific participation.

### Key Fields

- `id`
- `name`
- `broker`
- `broker_account_last4`
- `currency`
- `cash`
- `frozen`
- `margin_limit`
- `available_margin`
- `is_active`
- `created_at`
- `updated_at`

### Update Policy

- Account name and broker can be user-edited.
- Cash/frozen/margin fields are mutable current-state fields.
- Historical deposits, withdrawals, FX, and holdings should live in separate finance tables.

### Source

User and broker.

## 9. `account_ipo`

Personal account participation in a specific IPO.

### Responsibility

- User actions and outcomes.
- Connects accounts to IPOs.
- Stores applications, allotment, cost, sale summary, and profit.

### Key Fields

- `id`
- `account_id`
- `ipo_id`
- `apply_lots`
- `apply_amount`
- `subscription_method`
- `funding_source`
- `status`
- `allotted_lots`
- `allotted_shares`
- `commission`
- `financing_fee`
- `sell_amount`
- `profit`
- `profit_rate`
- `created_at`
- `updated_at`

### Update Policy

- User editable while record is in-progress.
- After final sale, keep as historical record; corrections should update with audit log in later sprint.

### Source

User and derived system calculations.

## 10. `sync_log`

Synchronization audit log.

### Responsibility

- Records every sync run.
- Supports operation review and failure diagnosis.

### Key Fields

- `id`
- `provider`
- `status`
- `start_time`
- `end_time`
- `added`
- `updated`
- `failed`
- `message`

### Update Policy

- Create as `running`, then update once to `success` or `failed`.
- Keep forever or archive by policy later.

### Source

System.

## Relationship Rules

- `ipo` owns official identity.
- `ipo_timeline`, `ipo_subscription`, `ipo_margin`, `ipo_performance`,
  `ipo_analysis`, and `ipo_source` belong to `ipo`.
- `account_ipo` links `account` and `ipo`.
- Sync providers write source rows, then normalized rows.
- Pages read normalized tables only.
- External providers never become page dependencies.

## Data Mutability Summary

| Table | Mutable | Permanent / Append-Only |
| --- | --- | --- |
| `ipo` | status, name before listing, industry | code after listing |
| `ipo_timeline` | limited correction | prefer append for changed dates |
| `ipo_subscription` | before pricing | final offer price after official pricing |
| `ipo_margin` | before subscription end | source snapshots |
| `ipo_performance` | provider corrections | source snapshots |
| `ipo_analysis` | yes | keep model/user provenance |
| `ipo_source` | no | append-only |
| `account` | yes | account id |
| `account_ipo` | yes, with audit later | completed history |
| `sync_log` | only running -> final | completed logs |

## Implementation Notes

- PostgreSQL should be the production target.
- Numeric money fields should become `Decimal` during the PostgreSQL migration.
- Current SQLite-compatible Prisma schema can continue until runtime migration is ready.
- Do not build HKEX fetching before this model is approved.
