# Life OS v60: live workspace

The approved interface is the first client of a new versioned workspace contract. It uses the platform's built-in IndexedDB and Web Crypto APIs, with no dependency, framework, remote database or analytics. The old localStorage collections and workout keys remain untouched.

## Data boundary

Each domain exposes a plain snapshot and a validating restore operation. The workspace format is `lifeos-state/1`. It retains all journal revisions, pantry movements, financial signed legs, capture receipts, relationships and ambition links. It is deliberately distinct from the old flat collection formats. In particular, a financial journal event is not passed to the legacy moneyTransaction writer, which would discard its legs and revision information.

The write path is `LifeOSWrite.workspaceSnapshot` to `LifeOSDB.upsert('workspaceSnapshots', entity)` to an IndexedDB transaction. That transaction commits the entire related workspace state, including meal and inventory changes, together. An expected revision rejects stale writes from another window. The six legacy canonical writers and their collection semantics remain intact. Domain restore hooks and the workspace writer are the contract a later native client can call. A later shared store must implement this contract or an explicit migration, rather than silently dual-write the two data models.

The current workspace is a single versioned document. Historical events inside it keep their individual immutable revisions. IndexedDB removes the much smaller localStorage capacity limit, but very large histories should eventually be split into indexed records behind the same data boundary. No records are pruned to make a save succeed. Storage failure is visible and an encrypted export remains available.

## Capture contract

The live text parser retains the reviewed target/entity proposal format and routes confirmed proposals through the new domain models. It is distinct from the existing `lifeos-ops/1` canonical legacy-writer format. Those formats must never be passed to each other's committers. Capture proposals, their original words and consumed operation receipts are included in workspace persistence. This release uses deterministic on-device text patterns. It does not connect to an AI, speech service or home server.

## Privacy and backups

Personal records live in IndexedDB on this device. The app makes no data-upload, third-party or telemetry requests. Static app files are downloaded from the existing host. The host can see requests for those files; it does not receive the local workspace. Device protection depends on the phone's encryption and screen lock. App records are not separately password-encrypted inside the browser.

Portable backups use AES-256-GCM with a random 96-bit nonce and a 128-bit salt. PBKDF2-SHA256 derives the key from the user's password with 600,000 iterations. Neither password nor key is saved. Only encrypted bytes are downloaded. A backup includes the complete new workspace and a legacy archive, including workout keys. Restoring a new workspace does not overwrite the old localStorage data. The legacy archive is preserved for future migration, not presented as converted records. A lost backup password cannot be recovered by the app.

## Release and verification

Only the production asset allowlist is deployed. Prototype files containing reference financial details, local documents, tests and backups are excluded. Assets are cached as one release. A SHA-256 release manifest verifies every required file before installation can complete, rejecting missing files and mixed releases. The current release remains usable until the complete update is ready. A running workout or work clock is persisted and resumes after reloading.

The live app starts with empty historical records and editable generic libraries. Dates and clocks use actual device time; the work calendar retains its explicit regional rules. Receipt rows, sleep and transactions can be entered manually. Garmin import, offline speech recognition, automatic receipt OCR, background reminders and a home inference connection require separate integrations and are not represented as active services.
