# Ben Bodybuilding Coach V1.6

V1.6 begins the cloud-data/progression phase.

## Added
- Supabase account connection via email magic link.
- Secure per-user database schema is live.
- Exercise library seeded for the current Shoulders + Arms session.
- Database helper for historical set retrieval.
- Progression engine can calculate LAST / BEST / TODAY once cloud history exists.
- Existing V1.5.1 local workout UI remains intact while migration to cloud storage is completed.

## Upload
Upload all files in this folder to the GitHub repository root and replace existing files.
The build marker should show `v1.6`.

## Important
V1.6 is a transition build. Existing localStorage history has not been silently copied to the cloud because historical data should be verified before import.
