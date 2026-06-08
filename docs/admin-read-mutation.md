# Admin Read Endpoint Mutation — Auto-Verify Minority Docs

> **Mosaic Biz Hub — Backend Reference**  
> Last reviewed: 2026-06-08  
> Scope: Wave 2 – Admin read endpoints mutating verification data via `autoVerifyMinorityDocsIfMissing`

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Business Requirement Behind the Behaviour](#2-the-business-requirement-behind-the-behaviour)
3. [What `autoVerifyMinorityDocsIfMissing` Does](#3-what-autoverifyminoritydocsifmissing-does)
4. [Where It Is Called](#4-where-it-is-called)
5. [The Read-Mutates Problem — Exact Code](#5-the-read-mutates-problem--exact-code)
6. [Why This Matters Technically](#6-why-this-matters-technically)
7. [Current Position — Acceptable for MVP](#7-current-position--acceptable-for-mvp)
8. [Post-MVP: Correct the Placement (Deferred)](#8-post-mvp-correct-the-placement-deferred)

---

## 1. Overview

The audit found that `getPendingApplications` and `getApplicationDetails` — both admin **read** endpoints — call `autoVerifyMinorityDocsIfMissing` as part of their response logic. This function does not just read data; it **writes to the database** — setting `verificationChecklist.minorityDocs = true`, adding 10 points to `totalVerificationPoints`, and syncing those values to the `Business` record — whenever the conditions are met.

The concern is that a read operation should only read. Verification data should only change through explicit, intentional actions.

However, this behaviour exists because of a **deliberate business decision**: vendors who do not submit minority documents should automatically receive 10 baseline points so that the absence of documents does not unfairly block their eligibility. The function is intentional — the placement inside read endpoints is where the implementation concern lies.

---

## 2. The Business Requirement Behind the Behaviour

The platform is designed for minority-owned businesses. However, not every vendor will have formal minority proof documents. The business decision is:

> **If a vendor has not uploaded any minority proof documents, they should automatically be awarded 10 points for the `minorityDocs` checklist item, so the lack of documents does not penalise them below the badge threshold.**

This makes the auto-award a feature, not a bug. It ensures:

- Vendors without minority documents are not stuck at 0 points on the minority item.
- The 10 points are awarded exactly once — the function checks `verificationChecklist.minorityDocs` first and returns immediately if it's already true.
- This removes the need for an admin to manually award those 10 points as a separate step when no documents exist.

The logic is sound. The concern is purely about **when** it runs — specifically that it runs during read operations rather than in a dedicated write operation.

---

## 3. What `autoVerifyMinorityDocsIfMissing` Does

**File:** [`controllers/admin/vendorOnboardVerifyStage1.js`](../../controllers/admin/vendorOnboardVerifyStage1.js) L26–40

```js
const autoVerifyMinorityDocsIfMissing = async (application) => {

  // Guard 1: If minority docs exist, do nothing
  const hasMinorityProofDocuments = Array.isArray(application.minorityProofDocuments)
    && application.minorityProofDocuments.length > 0;

  // Guard 2: If already awarded, do nothing
  if (hasMinorityProofDocuments || application.verificationChecklist.minorityDocs) {
    return 0;  // exits here — no writes occur
  }

  // Only reaches here if: no documents AND not already awarded
  application.verificationChecklist.minorityDocs = true;   // ← write
  application.totalVerificationPoints += 10;               // ← write
  await application.save();                                // ← DB write
  await syncBusinessPoints(application);                   // ← Business DB write

  return 10;
};
```

**The function is idempotent** — once it runs and awards points, both guards (`hasMinorityProofDocuments` and `verificationChecklist.minorityDocs`) will be true on subsequent calls, so it will return 0 and do nothing. It can only fire once per application.

---

## 4. Where It Is Called

| Location | Type | When called |
|---|---|---|
| `getPendingApplications` (L54) | Read endpoint | Every time admin loads the pending applications list |
| `getApplicationDetails` (L109) | Read endpoint | Every time admin opens a single application |
| `verifyAndAllocatePoints` (L169) | Write endpoint | When admin tries to verify `minority-proof` but no docs exist |
| `finalizeVerification` (L430) | Write endpoint | Before computing the final approval/rejection decision |

The function runs correctly and intentionally in `verifyAndAllocatePoints` and `finalizeVerification` — those are explicit write/action endpoints. The concern is only with `getPendingApplications` and `getApplicationDetails`, where the admin is simply viewing data but a write occurs as a side effect.

---

## 5. The Read-Mutates Problem — Exact Code

### `getPendingApplications` — L47–68

```js
exports.getPendingApplications = async (req, res) => {
  try {
    const applications = await VendorOnboarding.find({})
      .populate('userId', 'name email')
      .sort({ submittedAt: -1, createdAt: -1 });

    // ← Runs a write operation for every application in the list
    await Promise.all(
      applications.map((application) => autoVerifyMinorityDocsIfMissing(application))
    );

    return res.status(200).json({ success: true, data: applications });
  }
```

Every time an admin opens the pending applications list, the system loops through all applications and attempts to award 10 points to any that haven't had it applied yet. The first call after a vendor submits their application will fire a `save()` and a `Business` update. Subsequent calls will be no-ops.

### `getApplicationDetails` — L94–122

```js
exports.getApplicationDetails = async (req, res) => {
  try {
    const application = await VendorOnboarding.findOne({ applicationId })
      .populate('userId', 'name email phone');

    // ← Runs a write operation when viewing a single application
    await autoVerifyMinorityDocsIfMissing(application);

    return res.status(200).json({ success: true, data: application });
  }
```

Same pattern — viewing a single application triggers the auto-award if it hasn't been applied yet.

---

## 6. Why This Matters Technically

### The mutation happens at an unexpected moment

An admin loading the application list does not expect that action to change any data. If an admin views applications in a test or staging environment to inspect data, those applications will have their points modified as a side effect of the GET request.

### The timing of the first award is unpredictable

The 10 points are awarded on the **first time an admin views** the application — not when the vendor submits, not when a dedicated admin action is taken. This means:

- If an admin views an application immediately after submission, points are awarded immediately.
- If no admin views the list for days, points are not awarded until then.
- The vendor's total points and badge eligibility silently change at the moment of first admin view.

### `getPendingApplications` runs it on ALL applications, not just submitted ones

The current `getPendingApplications` fetches all applications (`VendorOnboarding.find({})`) — not just `status: 'submitted'`. This means it runs `autoVerifyMinorityDocsIfMissing` on `draft`, `rejected`, `payment_pending`, and `verified` applications too, not just those under review.

For `verified` applications where `minorityDocs` is already true, the guard catches it and returns 0 — so no harm done. But it still runs unnecessary async operations on every application in the collection on every admin page load.

### Parallel write race condition potential

The function uses `Promise.all` across all applications simultaneously. If the server handles two admin requests to `getPendingApplications` at exactly the same time, the same application could theoretically enter `autoVerifyMinorityDocsIfMissing` twice before either write completes, potentially awarding 20 points instead of 10. The idempotency guard reads from the in-memory document object, not from a fresh DB query.

---

## 7. Current Position — Acceptable for MVP

### Why this is not blocking launch

**The auto-award fires at most once per application.** Because `verificationChecklist.minorityDocs` is set to `true` on first execution and persisted to the database, every subsequent call — whether from a read or a write endpoint — will hit the guard and return immediately. The actual mutation happens exactly once per application, not repeatedly.

**The 10-point award is always correct.** If a vendor has no minority proof documents and hasn't been awarded the baseline points yet, they should receive them. The function does the right thing regardless of which endpoint triggers it.

**Admin-only endpoints, not vendor-facing.** These endpoints are behind `authenticate + isAdmin`. A vendor cannot trigger this mutation. Only admin users accessing the admin panel cause it to run.

**No visible impact on the vendor journey.** Whether the 10 points are awarded when the admin views the list or during `finalizeVerification`, the outcome for the vendor is the same.

### Risk classification

| Risk | Assessment |
|---|---|
| 10 points awarded incorrectly | Very low — guards prevent double-award |
| Points awarded at wrong time | Cosmetic — correct amount, different moment |
| Race condition on parallel admin requests | Very low in practice — admin team is small |
| Draft/rejected apps processed unnecessarily | Low overhead — no-op calls, no data change |

---

## 8. Post-MVP: Correct the Placement (Deferred)

The fix is not to remove the business logic — it is to move it out of read endpoints and into the correct write-time locations.

- [ ] **Remove `autoVerifyMinorityDocsIfMissing` from `getPendingApplications`** — the list endpoint should only read and return data. No writes.
- [ ] **Remove `autoVerifyMinorityDocsIfMissing` from `getApplicationDetails`** — same principle — viewing an application should not alter it.
- [ ] **Keep the call in `verifyAndAllocatePoints`** — this is correct. When an admin explicitly tries to verify `minority-proof` and no documents exist, auto-awarding is the right response and the endpoint is an intentional write action.
- [ ] **Keep the call in `finalizeVerification`** — this is also correct. The finalize step is the last chance to ensure the 10 points are in place before computing the approval decision.
- [ ] **Optionally: move the auto-award to `submitForReview`** — awarding the 10 points at the moment a vendor submits their application (no minority docs present) is the cleanest placement. It happens once, at a predictable moment, as part of an explicit action.
- [ ] **Filter `getPendingApplications` to submitted-only** — the original commented-out version `VendorOnboarding.find({ status: 'submitted' })` is more correct for an "admin review" list. Processing all statuses unnecessarily is a separate concern.
