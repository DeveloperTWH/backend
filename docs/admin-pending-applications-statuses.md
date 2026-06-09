# Admin Pending Applications Statuses

`controllers/admin/vendorOnboardVerifyStage1.js#getPendingApplications` now uses an explicit allowlist for the admin stage-1 review queue:

- Included: `submitted`
- Excluded: `draft`
- Excluded: `payment_pending`
- Excluded: `rejected`
- Excluded: `verified`

Notes:

- In this codebase, an admin-approved stage-1 application is persisted as `verified` even if some responses or UI text say "approved".
- Rejected applications do not stay in the queue. If a vendor edits and resubmits after rejection, the vendor flow transitions the record back to `submitted`, and that resubmitted record is eligible for the queue again.
- There is no separate stage-1 `incomplete` or `abandoned` enum in `models/VendorOnboardingStage1.js`. Those states are excluded by the positive allowlist because only `submitted` is considered review-ready.
