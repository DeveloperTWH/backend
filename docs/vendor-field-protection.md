# Vendor Field Protection — Sensitive Field Write Control

> **Mosaic Biz Hub — Backend Reference**  
> Last reviewed: 2026-06-08  
> Scope: Wave 2 – Privilege & data integrity audit on vendor-facing profile update endpoints

---

## Table of Contents

1. [Overview](#1-overview)
2. [What Fields Are Sensitive](#2-what-fields-are-sensitive)
3. [How Each Endpoint Currently Handles Payload Fields](#3-how-each-endpoint-currently-handles-payload-fields)
   - [3.1 saveDraft — Has Partial Protection](#31-savedraft--has-partial-protection)
   - [3.2 updateBusinessProfile (PUT) — No Field Filtering](#32-updatebusinessprofile-put--no-field-filtering)
   - [3.3 patchBusinessProfile (PATCH) — Has Allowlist](#33-patchbusinessprofile-patch--has-allowlist)
4. [The Theoretical Exploit Path](#4-the-theoretical-exploit-path)
5. [What the Business Sync Does With These Fields](#5-what-the-business-sync-does-with-these-fields)
6. [How These Sensitive Fields Are Actually Set (Correct Flows)](#6-how-these-sensitive-fields-are-actually-set-correct-flows)
7. [Current Mitigation — Frontend Controls](#7-current-mitigation--frontend-controls)
8. [Post-MVP: Backend Field Protection (Deferred)](#8-post-mvp-backend-field-protection-deferred)

---

## 1. Overview

The `VendorOnboardingStage1` document contains both **vendor-editable profile fields** (business name, bio, logo, contact details) and **admin/system-only fields** (badge, verification points, verification checklist, application status).

The concern is that `updateBusinessProfile` (the `PUT` endpoint) applies all incoming `req.body` keys directly to the onboarding document **without filtering out the sensitive fields first**. In theory, a vendor who knows the field names could submit a crafted request to alter their own verification standing.

**Current position:** The frontend does not send these sensitive fields in profile update requests, and the normal vendor journey provides no UI to do so. This makes the risk theoretical for the current MVP. However, the gap in backend field protection is real and is noted here for post-MVP hardening.

---

## 2. What Fields Are Sensitive

These fields on `VendorOnboardingStage1` must only be written by admin workflows or backend system events — never by a vendor submitting a profile update.

| Field | Type | Set by | Risk if vendor-writable |
|---|---|---|---|
| `status` | enum: `draft / payment_pending / submitted / verified / rejected` | Admin approval flow, payment webhook | Vendor could self-approve or skip verification |
| `badge` | enum: `Bronze / Silver / Gold / Platinum / Diamond` | Admin `verifyAndAllocatePoints` action | Vendor could self-assign a Diamond badge |
| `totalVerificationPoints` | Number | Admin `verifyAndAllocatePoints` action | Vendor could inflate their trust score |
| `verificationChecklist` | Object (12 boolean flags) | Admin verification workflow | Vendor could mark their own docs as verified |
| `applicationId` | String (immutable) | Auto-set on first save (pre-save hook) | Vendor could overwrite their unique application ID |
| `verificationPayment` | Object (`status`, `paidAt`, etc.) | Stripe webhook | Vendor could mark payment as paid without paying |
| `profileCompletionNotifiedAt` | Date | Set when admin notification email is sent | Vendor could suppress or replay the notification |
| `businessId` | ObjectId | Set by Business sync after `business.save()` | Vendor could link themselves to another vendor's Business record |
| `submittedAt` | Date | Set by `submitForReview` | Vendor could backdate or clear their submission timestamp |

---

## 3. How Each Endpoint Currently Handles Payload Fields

### 3.1 `saveDraft` — Has Partial Protection

**File:** [`controllers/vendorOnboarding.controller.js`](../controllers/vendorOnboarding.controller.js) L145–147

```js
// 4️⃣ Remove forbidden fields
const forbiddenFields = ["verificationPayment", "status", "applicationId"];
forbiddenFields.forEach((field) => delete payload[field]);
```

`saveDraft` explicitly strips **3 fields** before applying the payload. This is a partial allowlist — `verificationPayment`, `status`, and `applicationId` cannot be set by vendors through this endpoint.

However, `badge`, `totalVerificationPoints`, `verificationChecklist`, `businessId`, `submittedAt`, and `profileCompletionNotifiedAt` are **not in this forbidden list** and would pass through if submitted.

---

### 3.2 `updateBusinessProfile` (PUT) — No Field Filtering

**File:** [`controllers/vendorOnboarding.controller.js`](../controllers/vendorOnboarding.controller.js) L587–592

```js
// 2️⃣ Update onboarding with payload
Object.keys(payload).forEach(key => {
  if (payload[key] !== undefined) {
    onboarding[key] = payload[key];
  }
});
```

There is **no forbidden field list here at all**. Every key in `req.body` that is not `undefined` is applied directly to the onboarding document. This means all 9 sensitive fields listed in Section 2 could theoretically be overwritten by a crafted vendor request.

Contrast this with `saveDraft` which at least strips 3 fields. `updateBusinessProfile` strips none.

---

### 3.3 `patchBusinessProfile` (PATCH) — Has Allowlist (Correct Pattern)

**File:** [`controllers/vendorOnboarding.controller.js`](../controllers/vendorOnboarding.controller.js) L815–829

```js
// 3️⃣ Allowed fields for PATCH update
const allowedFields = [
  'firstName', 'lastName', 'primaryEmail', 'primaryPhone', 'language',
  'licenseNumber', 'businessBio', 'characterLimit', 'businessProfileImage',
  'businessEmail', 'businessPhone', 'alternatePhone',
  'website', 'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok',
  'refundPolicyDocument', 'termsDocument', 'googleReviewLink', 'communityServiceLink'
];

// 4️⃣ Only update allowed fields that exist in payload
allowedFields.forEach(field => {
  if (payload[field] !== undefined) {
    onboarding[field] = payload[field];
  }
});
```

The `PATCH` endpoint uses the **correct pattern** — an explicit allowlist. Only the 21 fields in this list can be written. Any sensitive field submitted in the body is silently ignored because it's not in the list. This is how `PUT` should also work.

---

## 4. The Theoretical Exploit Path

Using `PUT /api/vendor-onboarding/business-profile` with a crafted body:

```json
{
  "businessName": "My Legit Business",
  "badge": "Diamond",
  "totalVerificationPoints": 500,
  "verificationChecklist": {
    "minorityDocs": true,
    "taxDocs": true,
    "businessLicense": true,
    "website": true,
    "businessProfileImage": true,
    "businessBio": true,
    "refundPolicyDocument": true,
    "termsDocument": true
  },
  "status": "verified"
}
```

Under the current `PUT` handler, all of these fields would be written to the `VendorOnboarding` document. The Business sync would then also copy `badge` and `points` into the `Business` document.

**What this would give the vendor:**
- A `Diamond` badge on their profile and Business record
- Inflated trust score visible to admins and on the marketplace
- All verification checklist items marked true without admin review
- Application status set to `verified` without going through admin approval

**Why this hasn't happened in practice:** The frontend profile update form only sends legitimate profile fields — it has no inputs for `badge`, `totalVerificationPoints`, `verificationChecklist`, or `status`. A vendor would need to deliberately craft and send a raw HTTP request to exploit this.

---

## 5. What the Business Sync Does With These Fields

After the onboarding document is saved, the Business sync block reads two sensitive fields from the onboarding record and writes them to the `Business` document:

```js
const businessData = {
  // ...
  points: onboarding.totalVerificationPoints || 0,   // ← synced to Business
  badge:  onboarding.badge || null,                  // ← synced to Business
};
```

This means if a vendor successfully wrote a manipulated `badge` or `totalVerificationPoints` to their onboarding record, those values would also propagate to their `Business` record — affecting what appears publicly on the marketplace.

---

## 6. How These Sensitive Fields Are Actually Set (Correct Flows)

These fields are only modified through admin-controlled backend workflows:

### `badge` and `totalVerificationPoints`

Set by the admin controller `verifyAndAllocatePoints`:

```
Admin panel
  → GET /api/vendor-onboarding/pending        (list pending applications)
  → GET /api/vendor-onboarding/:applicationId (review documents)
  → POST /api/vendor-onboarding/:applicationId/verify
    → controllers/admin/vendorOnboardVerifyStage1.js
      → Calculates points from checklist
      → Sets badge based on points threshold
      → Saves both to VendorOnboarding
      → Business sync propagates to Business document
```

### `verificationChecklist`

Set by the same admin `verifyAndAllocatePoints` flow. Each boolean flag is set by the admin reviewing the actual uploaded documents — a vendor cannot mark their own documents as verified.

### `status`

Transitions follow a controlled state machine:
- `draft` → `payment_pending` — set by `createVerificationPayment`
- `payment_pending` → `draft` — set by Stripe webhook on payment success
- `draft` → `submitted` — set by `submitForReview`
- `submitted` → `verified` or `rejected` — set by admin `finalizeVerification`
- `rejected` → `submitted` — auto-set by `saveDraft` when vendor edits after rejection

### `applicationId`

Set once in the `VendorOnboardingStage1` pre-save hook and marked `immutable: true` in the schema. Mongoose will reject any attempt to overwrite it after initial creation.

### `verificationPayment`

Set and updated only by the Stripe webhook handler `handleVendorPaymentWebhook`. The vendor can initiate a payment intent (which creates the pending entry) but the `status: 'paid'` transition is triggered exclusively by Stripe's signed webhook event.

---

## 7. Current Mitigation — Frontend Controls

### How the frontend prevents this in practice

The vendor profile update form only includes inputs for legitimate profile fields:

| Frontend form section | Fields sent in PUT body |
|---|---|
| Personal information | `firstName`, `lastName`, `primaryEmail`, `primaryPhone`, `language` |
| Business information | `businessName`, `businessBio`, `businessProfileImage`, `featureBanner`, `licenseNumber` |
| Contact details | `businessEmail`, `businessPhone`, `alternatePhone` |
| Social links | `website`, `facebook`, `instagram`, `twitter`, `linkedin`, `tiktok` |
| Documents | `refundPolicyDocument`, `termsDocument`, `googleReviewLink`, `communityServiceLink` |
| Business type | `businessType`, `ownershipType`, `employeesCount` |

None of the sensitive fields (`badge`, `totalVerificationPoints`, `verificationChecklist`, `status`, `applicationId`, `verificationPayment`, `businessId`, `submittedAt`, `profileCompletionNotifiedAt`) are present in any frontend form and are never sent in a normal profile update request.

### Risk classification for MVP

| Exploit scenario | Likelihood | Impact | MVP risk |
|---|---|---|---|
| Vendor uses browser devtools to modify form payload | Low | High (if successful) | Low — requires deliberate technical effort |
| Vendor uses Postman / curl with crafted body | Medium | High | Accepted for MVP — this is a developer-level action, not a real user scenario |
| Frontend form accidentally sends a sensitive field | Very low | High | Very low — fields are not in any form component |

**Verdict:** The gap is real but the practical risk before launch is low because exploiting it requires deliberate technical effort that goes well beyond normal vendor usage. The frontend does not expose any mechanism for vendors to supply these fields.

---

## 8. Post-MVP: Backend Field Protection (Deferred)

The correct backend fix is to bring `updateBusinessProfile` in line with the `patchBusinessProfile` pattern — use an explicit allowlist of permitted fields instead of applying all payload keys.

The following items should be addressed post-MVP:

- [ ] **Apply a forbidden-field strip to `updateBusinessProfile`** — at minimum, remove `badge`, `totalVerificationPoints`, `verificationChecklist`, `status`, `applicationId`, `verificationPayment`, `businessId`, `submittedAt`, and `profileCompletionNotifiedAt` from the payload before applying it to the onboarding document.
- [ ] **Ideally replace with an allowlist (same as PATCH)** — explicitly define which fields vendors are permitted to write via PUT, and ignore everything else.
- [ ] **Extend `saveDraft` forbidden list** — currently only strips 3 fields; `badge`, `totalVerificationPoints`, `verificationChecklist`, `businessId`, `submittedAt`, and `profileCompletionNotifiedAt` should also be added.
- [ ] **Add an integration test** — send a crafted PUT body containing `badge: "Diamond"` and assert that the saved document does not reflect the submitted value.
