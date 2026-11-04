# Authentication and accounts (`AUTH`)

### REQ-AUTH-001 Email and password accounts

Users can register with email and password, sign in, sign out, and stay signed in through renewable sessions.

- Every API request except public ones (landing, auth endpoints, public media) requires a valid session token; otherwise it is rejected as unauthorized.
- Sessions are stored server-side and extended while in use; a signed-in user stays signed in across reloads and new tabs of the same browser.
- Signing out revokes the session server-side, not only in the browser.
- Passwords are stored as slow salted hashes. Accounts imported from a previous auth provider keep their passwords; their hashes are upgraded on the next sign-in.

### REQ-AUTH-002 Data isolation

A user can only list, read, modify, or delete their own data (CVs and their sections, media metadata, applications, AI settings, MCP key). Requests for another user's resource behave as "not found".

- Enforced by the API on every query (each read and write is scoped to the signed-in user), never only in the UI. Every data-access path has a cross-user test.

### REQ-AUTH-003 Session profile

The current-session endpoint returns the user's id, email, and profile picture URL (from the identity provider when available, otherwise null), so the UI can show an avatar without extra lookups.

### REQ-AUTH-004 Change password

A signed-in user can change their password from a Security settings page by entering the current password and the new one (with confirmation). Users who signed up without a password (social sign-in, passwordless) can set a first password without a current one.

- Wrong current password shows "Current password is incorrect"; a too-short or too-long new password shows the password-policy message; success shows a confirmation and clears the form.
- Changing the password signs out every other session; the current one stays signed in.

### REQ-AUTH-005 Password recovery `[optional]`

Users can request a recovery email and set a new password from the link in that email (valid for one hour). Resetting signs out every session and sends a "password changed" notice.

- The request always answers with the same generic message, whether or not the email exists (no account enumeration).
- The login page shows a "Forgot your password?" link only when the feature is enabled; the server rejects recovery requests when disabled.

### REQ-AUTH-006 Email verification `[optional]`

When enabled, new accounts must confirm their email before getting a session; password sign-in is refused until then. After registering, the user is sent to a "check your email" page. Opening the emailed link verifies the address and signs the user in.

- One server setting controls the flow; the web app's flag is derived from it at build time.

### REQ-AUTH-007 Passwordless sign-in `[optional]`

The login page offers "Password" (default), "Email me a code" (6-digit one-time code), and "Email me a link" (magic link).

- Code requests always answer with the same generic message; an invalid or expired code fails with "Invalid or expired code".
- Codes and links expire after five minutes and work once.

### REQ-AUTH-008 Social sign-in `[optional]`

Users can sign in with GitHub, Google, and LinkedIn (OpenID Connect), each enabled independently.

- All providers share one callback flow, which redirects to the requested destination (or the dashboard) using the **public** site origin, never an internal container address.
- The flow works when the web app and the API are served from different sites: it does not depend on third-party cookies. The API hands the new session to the web app through a single-use code that expires after two minutes.
- Only same-site relative destinations are honoured (no open redirects).
- A social sign-in produces the same kind of session as password sign-in; the API needs no provider-specific handling.
- Provider secrets come from environment variables, never from committed files.

### REQ-AUTH-009 Feature flags resolved at build time

Optional sign-in methods (recovery, email verification, passwordless, each social provider) are toggled per deployment. The server configuration is the source of truth: disabled methods are not served. The web app resolves matching flags at build time without a runtime request or layout shift, and the setup tooling derives the web flags from the server ones.

- Only the literal value `true` enables a flag; anything else, or a missing value, means disabled.

### REQ-AUTH-010 Password visibility toggle

The registration password field has a show/hide toggle. It is masked by default and does not change the submitted value.
