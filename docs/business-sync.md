# Business Sync Flow — Vendor Profile Update

> **Mosaic Biz Hub — Backend Reference**  
> Last reviewed: 2026-06-08  
> Scope: Wave 2 – Stop swallowing Business sync failures in `updateBusinessProfile`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model Relationship](#2-data-model-relationship)
3. [The Vendor Profile Update Flow](#3-the-vendor-profile-update-flow)
   - [3.1 PUT /api/vendor-onboarding/business-profile](#31-put-apivendor-onboardingbusiness-profile)
   - [3.2 PATCH /api/vendor-onboarding/business-profile](#32-patch-apivendor-onboardingbusiness-profile)
4. [Business Sync — What It Does](#4-business-sync--what-it-does)
5. [The Swallowed Failure — Exact Code Location](#5-the-swallowed-failure--exact-code-location)
6. [Why This Is a Problem](#6-why-this-is-a-problem)
7. [Fields Synced from VendorOnboarding to Business](#7-fields-synced-from-vendoronboarding-to-business)
8. [What Can Cause Business.save() to Fail](#8-what-can-cause-businesssave-to-fail)
9. [Impact on Downstream Systems](#9-impact-on-downstream-systems)
10. [Current Mitigation — Frontend Subscription Gate](#10-current-mitigation--frontend-subscription-gate)
11. [Post-MVP: Backend Enforcement (Deferred)](#11-post-mvp-backend-enforcement-deferred)

---

## 1. Overview

When a vendor updates their business profile via `PUT /api/vendor-onboarding/business-profile`, the system performs **two sequential write operations**:

1. **Primary write** — saves the vendor's data into the `VendorOnboardingStage1` collection.
2. **Secondary write (Business sync)** — creates or updates a corresponding record in the `Business` collection using the data just saved.

The `Business` record is the **operational record** used by the rest of the platform — product listings, service bookings, subscription limits, admin approval, and public marketplace display all depend on it.

The sync block is wrapped in a `try/catch` that only logs a warning on failure and returns `200 OK` regardless. The main trigger for this failure — a vendor calling the endpoint without an active subscription — **is currently prevented on the frontend**, which gates access to the profile update page behind subscription completion. This makes the risk acceptable for MVP. Backend-level enforcement is noted as a post-MVP item.

---

## 2. Data Model Relationship

```
┌─────────────────────────────────┐
│       User (role: business_owner)│
│       _id: ObjectId              │
└────────────────┬────────────────┘
                 │ 1
                 │
     ┌───────────┴────────────┐
     │                        │
     ▼ 1                      ▼ 1
┌────────────────┐   ┌────────────────────────┐
│ VendorOnboarding│   │       Business          │
│ Stage1          │   │                         │
│                 │   │  owner: → User._id      │
│ userId: → User  │   │  businessId linked      │
│ businessId: →  ─┼──►│  via onboarding.biz Id  │
│   Business      │   │                         │
│ status: draft / │   │  subscriptionId (req'd) │
│  submitted /    │   │  businessName (req'd)   │
│  verified       │   │  listingType (req'd)    │
└─────────────────┘   └────────────────────────┘
```

**Key constraint:** The `Business` model has three **required** fields:
- `businessName` (String, required)
- `listingType` (enum: `product | service | food`, required)
- `subscriptionId` (ObjectId, required)

If any of these are missing or invalid at the time of `Business.save()`, Mongoose will throw a `ValidationError`. Under the current code, that error is silently caught and discarded.

---

## 3. The Vendor Profile Update Flow

### 3.1 PUT /api/vendor-onboarding/business-profile

**File:** [`controllers/vendorOnboarding.controller.js`](../controllers/vendorOnboarding.controller.js) — `updateBusinessProfile` (L567)  
**Route:** `PUT /api/vendor-onboarding/business-profile`  
**Middleware:** `authenticate` → `requireVerifiedVendor`

```
Vendor Client                   Server
  │                               │
  │  PUT /api/vendor-onboarding/  │
  │      business-profile         │
  │  Body: { businessName,        │
  │    businessBio, businessEmail,│
  │    businessPhone, logo, ...}  │
  │──────────────────────────────►│
  │                               │  1. Authenticate + requireVerifiedVendor
  │                               │  2. Load Business, Subscription, VendorOnboarding
  │                               │  3. VendorOnboarding.findOne({ userId })
  │                               │     → 404 if no draft exists
  │                               │  4. Apply ALL payload fields to onboarding
  │                               │  5. Check isVendorProfileReadyForTrustBadge()
  │                               │     (has logo URL + bio)
  │                               │  6. await onboarding.save() ✅ PRIMARY WRITE
  │                               │  ┌──────────────────────────────────────────┐
  │                               │  │ try {                                    │
  │                               │  │   Subscription.findOne({ userId,         │
  │                               │  │     status:'active' })                   │
  │                               │  │   Business.findOne({ owner: userId })    │
  │                               │  │   Build businessData object              │
  │                               │  │   if (!business) → new Business(...)     │
  │                               │  │   else → update existing fields          │
  │                               │  │   await business.save() ← SECONDARY      │
  │                               │  │   onboarding.businessId = business._id   │
  │                               │  │   await onboarding.save()                │
  │                               │  │ } catch (businessError) {                │
  │                               │  │   console.log('⚠️ Business sync issue') │ ← SWALLOWED
  │                               │  │ }                                        │
  │                               │  └──────────────────────────────────────────┘
  │                               │  7. Optionally send admin profile email
  │                               │  8. return 200 OK ← ALWAYS, regardless of step 6
  │◄──────────────────────────────│
  │  200 { success: true,         │
  │    message: "Profile updated  │
  │    successfully" }            │
```

**Result:** Vendor sees success. VendorOnboarding is updated. Business record **may or may not** have been created/updated.

---

### 3.2 PATCH /api/vendor-onboarding/business-profile

**File:** [`controllers/vendorOnboarding.controller.js`](../controllers/vendorOnboarding.controller.js) — `patchBusinessProfile` (L797)  
**Route:** `PATCH /api/vendor-onboarding/business-profile`  
**Middleware:** `authenticate` → `requireVerifiedVendor`

The PATCH handler only updates an **allowed subset of fields** on the VendorOnboarding record. It **does not perform a Business sync at all** — no Business record is created or updated when this endpoint is called.

```
Allowed PATCH fields:
firstName, lastName, primaryEmail, primaryPhone, language,
licenseNumber, businessBio, characterLimit, businessProfileImage,
businessEmail, businessPhone, alternatePhone,
website, facebook, instagram, twitter, linkedin, tiktok,
refundPolicyDocument, termsDocument, googleReviewLink, communityServiceLink
```

This means changes made through PATCH — including the business bio and logo used by the `isVendorProfileReadyForTrustBadgeVerification` check — are **never synced to the Business record**.

---

## 4. Business Sync — What It Does

The Business sync block inside `updateBusinessProfile` performs the following operations:

```
1. Subscription.findOne({ userId, status: 'active' })
   → Gets the vendor's active subscription to populate subscriptionId,
     subscriptionPlanId, subscriptionStatus on the Business record

2. Business.findOne({ owner: userId })
   → Checks if a Business record already exists for this vendor

3a. If no Business exists → new Business({ owner, ...businessData })
3b. If Business exists → update 10 fields directly on the document
    → Also clears business.location to prevent a geo-index error

4. await business.save()
   → Saves the created/updated Business document to MongoDB

5. onboarding.businessId = business._id
   → Links the onboarding record back to the Business record
   await onboarding.save()
   → Saves the link (second onboarding write in this request)
```

---

## 5. The Swallowed Failure — Exact Code Location

**File:** [`controllers/vendorOnboarding.controller.js`](../controllers/vendorOnboarding.controller.js)

```js
// Lines 598–677

// ========== SIMPLE BUSINESS SYNC ==========
try {
  // ... subscription lookup ...
  // ... business find-or-create ...
  await business.save();   // ← If this throws, execution jumps to catch

  // Link onboarding <-> business for direct lookups in admin flows
  if (!onboarding.businessId || ...) {
    onboarding.businessId = business._id;
    await onboarding.save();  // ← Also skipped on error
  }

  console.log(`✅ Business data saved for user ${userId}`);

} catch (businessError) {
  console.log('⚠️ Business sync issue:', businessError.message);
  // ← No re-throw. No error response. Execution continues.
}

// ... admin email ...

return res.status(200).json({         // ← Always returns 200
  success: true,
  message: "Profile updated successfully",
  data: onboarding,
});
```

The `catch` block logs one line to the server console and does nothing else. The outer function then proceeds to return `200 OK` with `success: true`.

---

## 6. Why This Is a Problem

### 6.1 The vendor receives a false success signal

The response `{ success: true, message: "Profile updated successfully" }` is structurally identical whether or not the Business sync worked. The vendor has no way to know their Business record was not created or updated.

### 6.2 VendorOnboarding and Business silently drift out of sync

After a failed sync:

| State | VendorOnboarding | Business record |
|-------|------------------|-----------------|
| First call (no Business exists yet) | Updated ✅ | Not created ❌ |
| Subsequent calls (Business exists) | Updated ✅ | Stale / not updated ❌ |
| After sync failure resolved later | Updated ✅ | May reflect older data ❌ |

There is no field on either document that records whether the last sync attempt succeeded or failed. No retry mechanism exists. No alert is raised.

### 6.3 Downstream systems depend on the Business record

The `Business` record is the source of truth for:

| System | What it reads from Business |
|--------|-----------------------------|
| Product listings | `owner`, `listingType`, `subscriptionId`, `usage` |
| Service bookings | `owner`, `businessHours`, `subscriptionId` |
| Subscription limit enforcement | `subscriptionId`, `usage.totalProducts/Services/Foods` |
| Admin approval flow | `isApproved`, `isActive`, `owner` |
| Public marketplace | `businessName`, `logo`, `description`, `badge`, `points` |
| Vendor Stripe Connect | `stripeConnectAccountId`, `chargesEnabled` |

If the Business record does not exist or is stale, every one of these systems will either fail, return incorrect data, or silently use the wrong values.

### 6.4 The log-only approach is not operational visibility

`console.log('⚠️ Business sync issue:', businessError.message)` produces output that:
- Is only visible if someone is actively watching server logs.
- Is not persisted to any structured log, alerting system, or database field.
- Cannot be queried, searched, or reported on after the fact.
- Does not identify which vendor was affected beyond what appears in the same log line.

### 6.5 Business.save() has real failure modes

The `Business` model enforces three required fields and a unique slug. Failures include:

| Failure type | Trigger |
|---|---|
| `ValidationError: subscriptionId is required` | No active subscription found — `subscription?._id` is `null` |
| `ValidationError: businessName is required` | `onboarding.businessName` is empty or undefined |
| `ValidationError: listingType is required` | `onboarding.businessType` is undefined (falls back to `'product'` string only in the new business branch) |
| `MongoError: duplicate key error (slug)` | Race condition on slug uniqueness during first creation |
| Network / timeout error | Transient MongoDB connectivity issue |

The `subscriptionId` case is especially likely during early onboarding when a vendor has not yet subscribed — the sync block queries `Subscription.findOne({ userId, status: 'active' })` and passes `null` to the Business field if none is found.

---

## 7. Fields Synced from VendorOnboarding to Business

The following fields are read from the `VendorOnboarding` document and written to the `Business` document during a successful sync:

| Business field          | Source (VendorOnboarding field)              |
|-------------------------|----------------------------------------------|
| `businessName`          | `onboarding.businessName`                    |
| `description`           | `onboarding.businessBio`                     |
| `logo`                  | `onboarding.businessProfileImage?.url`       |
| `coverImage`            | `onboarding.featureBanner?.url`              |
| `email`                 | `onboarding.businessEmail` or `secondaryBusinessEmail` |
| `phone`                 | `onboarding.businessPhone` or `primaryPhone` |
| `listingType`           | `onboarding.businessType` (default: `'product'`) |
| `points`                | `onboarding.totalVerificationPoints`         |
| `badge`                 | `onboarding.badge`                           |
| `subscriptionId`        | `subscription._id` (from active Subscription) |
| `subscriptionPlanId`    | `subscription.subscriptionPlanId`            |
| `subscriptionStatus`    | `subscription.status`                        |

Additionally, after save, `onboarding.businessId` is set to `business._id` to link both documents together.

---

## 8. What Can Cause Business.save() to Fail

### Required field validation failures

The `Business` schema marks three fields as `required: true`. If any are missing when `business.save()` is called, Mongoose throws a `ValidationError` before touching MongoDB:

```
- owner         → always present (userId from req.user._id)
- businessName  → from onboarding.businessName — may be empty string or undefined
- listingType   → from onboarding.businessType with fallback 'product'
- subscriptionId → from Subscription.findOne result — null if no active subscription
```

The `subscriptionId: null` case is the most common real-world failure. Early-stage vendors who have not yet subscribed will fail here on every profile update.

### Mongoose pre-save hook failure (slug generation)

The `Business` model has a `pre('save')` hook that generates a unique `slug` from `businessName` using `slugify`. If `businessName` is empty or null, `slugify` may produce an empty string, leading to a duplicate-key conflict or an invalid slug.

### Geo-index conflict

The schema has `businessSchema.index({ location: '2dsphere' })` defined, and the sync block explicitly clears `business.location` on updates to avoid this. However, on new Business creation this field is not explicitly excluded, so if the MongoDB index already exists and a `location` field value is invalid, the save will fail.

### Transient infrastructure errors

Any MongoDB timeout, connection drop, or replica-set failover occurring during the save window will also cause `business.save()` to throw. Under normal error handling this would surface as a 500 error; under the current swallowed catch it disappears.

---

## 9. Impact on Downstream Systems

### Vendors cannot list products or services

`productController`, `serviceController`, and `foodController` all look up `Business.findOne({ owner: req.user._id })` before allowing a new listing to be created. If no Business record exists, the controller returns an error or an incorrect "limit exceeded" response.

### Subscription limits are not enforced correctly

Subscription limit enforcement reads `business.usage.totalProducts`, `business.usage.totalServices`, and `business.subscriptionId`. If the Business record was never created, these values are either unavailable or from a stale record.

### Admin approval queue is incomplete

The admin vendor verification flow reads from `VendorOnboardingStage1` and cross-references `Business` by `businessId`. If `onboarding.businessId` was never set (because the sync failed before that line), the admin UI cannot resolve the full vendor profile.

### Public marketplace shows stale data

Once a vendor is approved, their `Business` document is what appears on the public-facing marketplace. If the profile update was recorded in VendorOnboarding but not synced to Business, the marketplace shows the old business name, logo, or description.

---

## 10. Current Mitigation — Frontend Subscription Gate

### How the frontend prevents the critical failure case

The primary risk identified in this document — a vendor calling `PUT /business-profile` before subscribing, causing `subscriptionId: null` to be passed to `Business.save()` — **is currently managed by the frontend**.

The vendor onboarding journey on the frontend enforces a strict step order:

```
 Step 1 — Register & verify OTP
 Step 2 — Fill onboarding draft (saveDraft)
 Step 3 — Pay verification fee ($24.99 via Stripe)
 Step 4 — Admin reviews and verifies application
 Step 5 — Vendor subscribes to a plan          ← subscription created here
 Step 6 — Profile update page becomes accessible ← PUT /business-profile called here
```

The profile update page (`Step 6`) is **not rendered or accessible** on the frontend until the vendor has an active subscription. This means:

- By the time `PUT /api/vendor-onboarding/business-profile` is called, `Subscription.findOne({ userId, status: 'active' })` will always return a valid subscription.
- `subscriptionId` will never be `null` in the normal user journey.
- `Business.save()` will succeed for all vendors following the standard flow.

### Two remaining edge cases (acknowledged, not blocked for MVP)

| Case | Risk | Status |
|------|------|--------|
| Vendor submits profile with empty `businessName` | `Business.save()` fails silently | Low risk — frontend requires business name before allowing submit |
| Direct API call bypassing frontend (Postman, curl) | Could trigger sync failure if called pre-subscription | Accepted for MVP — not a real user flow |

Both cases result in a silent failure (swallowed catch) but do **not affect real vendors going through the standard frontend journey**.

---

## 11. Post-MVP: Backend Enforcement (Deferred)

If the frontend gating changes, or if the API is exposed to third-party consumers or a mobile app in future, backend-level enforcement will be needed. The following items should be addressed at that point:

- [ ] **Add a subscription check in the middleware or at the top of `updateBusinessProfile`** — return `403` with a clear message if no active subscription exists, instead of letting the sync fail silently.
- [ ] **Surface sync failures in the API response** — rather than a swallowed catch, return a partial-success response (`207 Multi-Status` or a `syncStatus` field) so the caller knows the onboarding record was saved but the Business record was not.
- [ ] **Add a `businessSyncedAt` or `businessSyncFailed` flag to `VendorOnboardingStage1`** — so the sync state is queryable without reading server logs.
- [ ] **Ensure PATCH /business-profile also triggers a Business sync** — currently PATCH updates the onboarding record but never syncs those changes to the Business document.
- [ ] **Structured error logging** — replace `console.log('⚠️ Business sync issue')` with a structured log entry (userId, error type, stack, timestamp) that can be searched and alerted on.
