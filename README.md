# Ben Bodybuilding Coach V1.5

GitHub Pages front-end prototype.

## V1.5 changes
- Sets start unticked.
- Tapping a set toggles complete / incomplete.
- Completed sets save exact kg, reps, RIR and timestamp locally.
- Exercise swaps now replace the performed movement while retaining the prescribed movement in history.
- Add Set creates an override set.
- Automatic rest timer starts only when a set is completed.
- Finished workouts save detailed set history.
- Workout dates are automatic and can be edited retrospectively in Progress.
- Rest / Reschedule records schedule changes without treating them as missed workouts.
- Weight entries are timestamped.
- Macro, InBody and progress-photo upload controls remain placeholders until backend storage/AI image analysis is connected.
- Service worker cache bumped to V1.5 and changed to network-first to reduce stale GitHub Pages builds.

## Update GitHub
Upload the contents of this folder to the existing repository root and choose Replace when GitHub reports duplicate files. Commit the changes. GitHub Pages will redeploy automatically.

## Important
V1.5 still stores training data in the browser via localStorage. Do not treat this as the permanent database. The next stage is a backend/database plus authenticated AI coaching endpoint.
