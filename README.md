# Ben Bodybuilding Coach V1.6.2

Backend separation build.

Changes:
- Repointed the app from the Pepilix Supabase project to the dedicated Bodybuilding Coach project.
- Database access now uses the dedicated project's public schema.
- New Bodybuilding Coach database contains the training model, RLS policies, indexes and seeded exercise library.
- Pepilix is no longer used by this build.
- Build/cache marker bumped to V1.6.2.

Upload every file in this ZIP to the GitHub repository root and replace the existing files.

Authentication still requires the dedicated Supabase project's Authentication > URL Configuration:
Site URL: https://pepilix.github.io/bodybuilding-coach/
Redirect URL: https://pepilix.github.io/bodybuilding-coach/**
