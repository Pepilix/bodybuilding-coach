# Ben Bodybuilding Coach V1.7

Cloud logging + AI Coach build.

## Added
- Completed working sets sync to the dedicated Bodybuilding Coach Supabase database.
- Unticking a set updates the cloud record to incomplete while retaining entered numbers.
- Prescribed vs performed exercise names are retained.
- Workout completion updates the cloud workout record.
- Ask Coach now calls the secured Supabase `coach` Edge Function.
- The coach receives current workout state plus recent cloud workout/set and body-metric history.
- Historical training from 17–24 Sep 2026 has been imported into Supabase from reliable recorded logs only.
- Original lb machine-stack values are preserved as lb rather than silently converted.

## One manual secret required
In Supabase > Bodybuilding Coach > Edge Functions / Secrets, add:
OPENAI_API_KEY = your OpenAI API key

Never put the OpenAI secret key in GitHub or db.js.

Upload all files in this ZIP to the GitHub repository root and replace existing files.
Confirm the build marker shows v1.7.
