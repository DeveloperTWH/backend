# Security Remediation Notes

## 1. JWT Secret Rotation

- Generate a new secret with a cryptographically secure command, for example:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

- Update `JWT_SECRET` in the deployment secret manager for each environment.
- Redeploy or restart every backend instance so all JWT signing and verification uses the new secret.
- Existing sessions are invalidated after deployment because token verification in `middlewares/authenticate.js` uses the current `process.env.JWT_SECRET`.

### Evidence to capture

- Commit or PR containing the remediation note and any auth-related code changes.
- Secret manager audit log, change history, or redacted screenshot showing `JWT_SECRET` was updated.
- Deployment/restart record showing the backend picked up the new secret.
- Staging retest:
  - an old token issued before rotation should return `401 Invalid or expired authentication token`
  - a fresh login after rotation should succeed

## 2. Public Registration Privilege Escalation

- Public `POST /register` only accepts `customer` and `business_owner`.
- Server-side registration now ignores privileged role input and defaults any unexpected role to `customer`.
- Admin account creation should happen only through authenticated internal/admin routes.

### Evidence to capture

- `POST /register` with `role=admin` should fail validation or result in a non-admin account.
- `POST /register` with `role=customer` should succeed.
- `POST /register` with `role=business_owner` should succeed.
- Protected admin-user creation flow should require an authenticated admin session.

## 3. OAuth Role Assignment

- Google OAuth no longer trusts `req.query.role` from the frontend.
- The backend now determines role assignment:
  - existing users keep their stored role
  - new Google users default to `customer`
- Querystring tampering can no longer upgrade a user to `business_owner` or `admin`.

### Evidence to capture

- Commit or PR containing the OAuth role-handling fix.
- OAuth login retest for an existing `customer` account.
- OAuth login retest for an existing `business_owner` account.
- Query tampering test, for example `?role=business_owner` on a customer account, showing the user remains `customer`.
- Any frontend follow-up note if the login page still sends `role` in the URL for legacy compatibility.
