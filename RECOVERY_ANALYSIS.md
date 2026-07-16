# Recovery Analysis

## Sources inspected

| Source | Backup date | Accounts | IPOs | Subscriptions | Allotments | Sell records |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `HKIPO_CLEAN.json` | 2026-06-08 | 12 | 14 | 1 legacy record | 98 legacy parts | n/a |
| `HKIPO_LATEST_RECOVERY_IMPORT.json` | 2026-06-16 | 12 | 19 | 163 | 163 | 24 |
| `recovery/HKIPO_RECOVERY_FULL_20260615_232754.json` | 2026-06-15 | 12 | 19 | 163 | 163 | 24 |
| `recovery/HKIPO_RECOVERY_20260615_233745.json` | 2026-06-15 | 12 | 16 | 131 | n/a | 23 |
| Chrome production LocalStorage `hkipo-dashboard:data:v3` | 2026-07-14 | 12 | 45 | 413 | embedded in subscriptions | 76 |

`backups/` and `exports/` do not exist in this checkout. The newest complete source is the
production browser snapshot. It was copied read-only to
`recovery/HKIPO_LIVE_BROWSER_20260714.json`; the `recovery/` directory is ignored by Git so
personal data will not be committed.

## PostgreSQL baseline

- Accounts: 12
- IPOs: 112
- Account IPO records: 163
- Sell records: 24
- Latest imported business activity: 2026-06-15

## Named IPO comparison

All requested IPO master rows already exist in PostgreSQL by stock code, but the official
provider has replaced their Chinese display names with English names.

| Recovery name | Code | PostgreSQL state | Existing subscriptions |
| --- | --- | --- | ---: |
| 天辰生物-B | 01779 | Present as `LongBio Pharma (Suzhou) Co., Ltd. - B` | 12 |
| 海清智元 | 01392 | Present as `Shenzhen HQVT Technology Co., Ltd.` | 12 |
| 华健未来-B | 06132 | Present as `HJ Science Co., Ltd. - B` | 9 |
| 星源材质 | 06067 | Present as `Shenzhen Senior Technology Material Co., Ltd.` | 11 |
| 麦科医药-B | 02335 | Present as `Shaanxi Micot Pharmaceutical Technology Co., Ltd. - B` | 0 |
| 江西生物 | 06915 | Present as `Jiangxi Institute of Biological Products Inc.` | 0 |
| 仙工智能 | 06106 | Present as `Shanghai Seer Intelligent Technology Co., Ltd.` | 0 |

The recovery operation therefore matches IPOs by normalized stock code and does not replace
existing official rows. Missing account participation and sell records are inserted separately.

## All IPOs after 2026-06-15

The browser source contains 26 post-cutoff IPOs. PostgreSQL already contains 22 of their master
rows. The four missing IPO masters are:

| Name | Code | Subscription date | Listing date |
| --- | --- | --- | --- |
| 永康股份 | 02523 | 2026-07-07 | 2026-07-10 |
| 宝盖新材 | 08090 | 2026-07-02 | 2026-07-07 |
| 来福谐波 | 03592 | 2026-06-25 | 2026-06-27 |
| MERDEKAGOLD-DRS | 06628 | 2026-06-22 | 2026-06-25 |

The other 22 post-cutoff IPO codes are already present, including 晶合集成、滨化股份、江西生物、
麦科医药-B and 仙工智能. Their post-cutoff account participation was not present.

## Dry-run result

`npx tsx scripts/recover-missing-data.ts --dry-run` reported:

- New IPOs: 4
- New subscriptions: 250
- New sell records: 52
- Database writes: 0

## Applied recovery

After a pre-recovery PostgreSQL export was saved outside Git, the insert-only recovery added:

- IPOs: 4
- Subscriptions: 250
- Sell records: 52

PostgreSQL now contains 12 accounts, 116 IPOs, 413 account IPO records, and 76 sell records.
A second dry-run reported zero inserts for every model.

## Recovery source integrity

- The source contains activity through 2026-07-11 and a complete backup generated on 2026-07-14.
- Account IDs match the imported PostgreSQL account IDs; a name plus suffix fallback is retained.
- Existing records are checked by primary ID and by account/IPO identity before any insert.
- The recovery script defaults to dry-run and cannot update or delete existing rows.
