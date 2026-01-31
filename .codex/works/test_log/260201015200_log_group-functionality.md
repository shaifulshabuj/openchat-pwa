# Playwright Test Log - Group Functionality (Re-verify)

**Timestamp:** 2026-02-01 01:52:00
**Environment:** Docker local test stack (web: http://localhost:3000, api: http://localhost:8080)
**Tester:** Playwright MCP

## Scope
- Group creation via + menu
- Group settings gear icon for created groups
- Invite members flow end-to-end

## Results
### ❌ Group creation via + menu
- Opened + menu → **Create Group**.
- Create Group modal opened; entered name `QA Group 260131-4`.
- Clicked **Create Group** → toast: **Failed to create group** / **Validation failed**.
- Console logs show `POST /api/chats` **400 Bad Request**.

### ⚠️ Group settings gear icon
- Opened existing group chat "OpenChat Developers".
- Chat header stayed in **Loading** state due to API errors (see below), so gear/settings visibility could not be verified.

### ⚠️ Invite members flow
- Not reachable because group creation failed and group settings modal could not be opened.

## Blocking Issues Observed
- API requests failed after entering group chat:
  - `net::ERR_CONNECTION_REFUSED` on `/api/chats/:id` and `/messages`.
  - Socket connection errors to `localhost:8080`.

## Follow-ups
- Fix `POST /api/chats` validation for group creation.
- Confirm API is reachable from web container (`localhost:8080` access).
- Re-test group settings and invite flow after API errors are resolved.
