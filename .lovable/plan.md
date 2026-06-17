## Scope

This is a wireframe-only schema-alignment pass touching ~18 categories across `src/lib/wireframe/data.ts` and most route files. Total surface: ~18k LOC; many of the renames (`org_id` → `organization_id`, `charge_type` → `event_type`, `date` → `event_date`, `stage` → `current_stage`) are used in dozens of places across every screen.

Because these are pure field renames in a shared mock layer, the safest approach is **atomic rename per field across all consumers in a single pass**. I will not preserve aliases — that would just defer the work and leave inconsistencies.

## Approach

1. **Inventory** — `rg` each renamed identifier to enumerate every file/site that touches it. Do this once up front per category so edits are batched.
2. **Edit `data.ts` first** for each category, then update all consumers in parallel writes.
3. **Build-check after each major category** (categories 1, 2/3, 4, 6, 12) rather than once at the end — a single typo in a shared field can cascade into hundreds of TS errors.

## Execution order (each group is one commit-sized batch)

**Batch A — Stages (cat 1)**
- Replace `STAGES` const with `DI_STAGES` + `LTC_STAGES` (canonical values).
- Update `COVERAGE_STAGE_PAIRS` to use DI values (since current data assumes DI-flavored stages); LTC individuals get an LTC-appropriate stage.
- Rename `stage` → `current_stage` on `INDIVIDUALS` (also cat 4).
- Update individuals list + dashboard badge maps.

**Batch B — Payment Ledger (cat 2, 3)**
- In `data.ts`: rename `date`→`event_date`, `charge_type`→`event_type`, `individual_id`→`enrollment_id` on `PAYMENT_LEDGER` rows; remap `monthly_premium`→`premium`, `employee`→`employee_account`, `employer`→`employer_account`.
- Update `payment-ledger.tsx` (column accessors, filter options — add `reversed` status and `adjustment` event_type), `enrollee-balance.tsx` (computeBalances filters + PHI export `table_name`), and any billing-group drawer that lists payments.

**Batch C — Cross-screen field renames (cat 4)**
- `org_id`→`organization_id` everywhere it appears on individuals/policies/enrollment_windows/enrollee-balance shapes.
- `affiliate_org_id`→`affiliate_organization_id`.
- Enrollment-window `start_date`/`end_date`→`enrollment_start_date`/`enrollment_end_date`.
- `upgrade_applied_for`→`applied_for_upgrade`; `pre_buyup_premium_cents`→`pre_upgrade_premium_cents`.
- `union_member`→`is_union_member`; `std_premium_cents`/`ltd_premium_cents`→`std_premium`/`ltd_premium` (and remove ÷100 — see cat 12).
- `contribution_*`→`employer_contribution_*` (4 fields).
- `next_sun_life_report_date`→`next_sunlife_report_date`; `attio_last_synced_at`→`attio_synced_at` on POLICIES (carriers keep their existing name unless audit also flagged it — it didn't).
- Commission: `channel_partners.name`→`partner_name`; `commission_rate_tiers` `year_from`/`year_to`/`pct`→`from_year`/`to_year`/`rate_pct`.

**Batch D — Policies status (cat 5)**
- Rename `status`→`enrollment_status` on POLICIES + `policies.tsx` filter key, column accessor, and any sort key. Display label stays "Status".

**Batch E — Audit Log (cat 6)**
- In audit mock data only: `ts`→`timestamp`, `table`→`table_name`, `before`→`old_values`, `after`→`new_values`, `actor`→`actor_name`. Update `audit.tsx` consumers (`phi-audit.ts` already correct — leave alone).

**Batch F — CHECK value fixes (cat 7, 8, 9, 10, 11, 15, 18)**
- Missing Submissions: status enum + default + onStatusChange.
- Account Adjustments: drop `billing_error`, sync filter+form lists to the 5 canonical values.
- Organizations: `10_pay`→`ten_pay`, `percent`→`percentage`, remove `individual` from index owner-type filter.
- Reports/dashboard: lowercase `successful|failed|pending`.
- Enrollment Windows: drop `employer+affiliate` from sponsor_type dropdown; derive display when sponsor=employer AND affiliate_org set.
- Affiliates: `industry_association`→`association` (label "Association").
- Individuals data: remove DI `relationship_type` entirely; LTC keeps primary/spouse.

**Batch G — Money column fixes (cat 12)**
- Remove `/100` on `original_monthly_premium`, `ltc_bronze..diamond`, `std_premium`/`ltd_premium`. Leave all `*_cents` alone.

**Batch H — New fields (cat 13, 14)**
- Commission statement drawer: add Approved By / Paid By / Payment Reference (Payment Ref required when Mark Paid).
- Billing groups drawer: add optional `name` field at top; list derives label when empty.

**Batch I — Affiliates cleanup (cat 16)**
- Remove `logo_url` field + upload UI; remove `deleted_at` from model.

**Batch J — Individuals product guards (cat 17)**
- Add `isLTC` guard around DI-only fields (title, employment_relationship, is_union_member, union_local_name, preferred_language, enrollment_deadline, monthly_premium_cents) in individual detail view.

## Out of scope (per the audit's own "intentionally not changed" list)

SI Buy-up labels, derived sponsor shape, computed balance, denormalized display fields, `commission_statements.policy_id`, `store.tsx` `fee_config` key.

## Verification

After each batch I'll run a typecheck signal via the build to confirm no rename left a dangling reference, then continue. UI is unchanged by design, so no visual review needed beyond the existing wireframe routes still rendering.

## Confirm before I start

This will touch nearly every route file. Two questions:

1. **Atomic renames vs. backwards-compat aliases** — I'm planning atomic (the wireframe has no external consumers; aliases would be dead weight). OK?
2. **Order** — Any preference on which batches to do first, or proceed A→J?