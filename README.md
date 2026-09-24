# Ben Bodybuilding Coach V1.6.1

Hotfix for V1.6 Cloud Data initialization.

The V1.6 HTML used single-quoted script tags, while the build step looked for double-quoted tags.
That meant `db.js` and the Supabase browser SDK were not actually loaded on the deployed pages,
so the Cloud Data card remained on “Checking account…”.

V1.6.1 explicitly loads:
- Supabase JS browser SDK
- db.js
- existing storage.js/app.js/workout.js

Upload all files to the repository root and replace the existing files.
After GitHub Pages deploys, confirm the bottom marker reads `v1.6.1`.
The Cloud Data card should then change from “Checking account…” to the email sign-in controls.
