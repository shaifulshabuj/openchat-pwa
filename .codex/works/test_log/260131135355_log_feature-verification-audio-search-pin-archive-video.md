# Playwright Test Log - Audio/Search/Pin/Archive/Video

**Timestamp:** 2026-01-31 13:53:55
**Environment:** Docker local test stack (web: http://localhost:3000, api: http://localhost:8080)
**Tester:** Playwright MCP

## Scope
- AudioRecorder component (recording UI + playback/send controls)
- ChatList pin/archiving actions
- MessageSearch component within chat
- VideoPlayer controls (play/pause/volume/fullscreen)

## Results
### ✅ AudioRecorder UI
- Audio recorder panel rendered in chat footer.
- State observed: "Permission Denied" with timer + Cancel button.
- Recording action not validated due to browser permission limitations in Playwright.

### ✅ Chat pin & archive
- Chat list item menu shows: **Pin Chat** and **Archive Chat**.
- Pin action: toast “Chat pinned” + pinned icon shown.
- Archive action: toast “Chat archived” + chat removed from main list.

### ⚠️ MessageSearch
- Search UI opens and accepts input.
- API request failed: `/api/chats/:id/messages/search` returned **404**.
- UI shows "No messages found for \"modern\"" and console logs "Search failed: 404".

### ⚠️ VideoPlayer controls
- Not verified: no video message available in current chats during run.

## Notes
- Dev overlay occasionally intercepts clicks; some interactions performed via DOM eval.
- Image CORP warnings appear in console from old avatar URLs but did not block tests.

## Recommended Follow-ups
- Implement or expose `/api/chats/:id/messages/search` route to satisfy MessageSearch.
- Add a seeded video message to enable VideoPlayer control verification.

---

## Retest (Playwright MCP)
**Timestamp:** 2026-01-31 14:45:00
**Environment:** Docker local test stack (web: http://localhost:3000, api: http://localhost:8080)

### ✅ MessageSearch
- Opened chat and searched for "modern".
- Results list rendered with "1 of 1" navigation and highlighted match.
- Clickable result present in search dropdown.

### ✅ AudioRecorder UI
- Audio recorder panel opened from chat footer.
- "Permission Denied" state displayed with timer and Cancel button (permission not granted in Playwright).

### ✅ Chat pin & archive
- Chat item menu showed Pin/Archive.
- Pin action displayed toast and pinned icon in chat row.
- Archive action displayed toast and removed chat from main list.

### ⚠️ VideoPlayer controls
- Not verified in this run (no video message available to open).

### Notes
- Console warnings about blocked image resources persisted but did not block interactions.
