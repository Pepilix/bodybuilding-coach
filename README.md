# Ben Bodybuilding Coach V1.5.1

This build is intentionally FLAT: all files go in the GitHub repository root.

This fixes the deployment problem where new HTML was loading while older JavaScript/CSS remained inside the existing `js` and `css` folders.

## Expected root files
- index.html
- workout.html
- history.html
- app.css
- storage.js
- app.js
- workout.js
- manifest.webmanifest
- sw.js
- README.md

You may delete the old `css` and `js` folders after this version is working.

## Functional checks
- Home shows the full Monday–Sunday training cycle.
- Rest / Reschedule opens a choice modal.
- Workout sets begin as empty circles, not completed ticks.
- Tapping the circle completes a set; tapping the tick reverses it.
- Swap opens alternatives and selecting one changes the performed exercise.
- Add Set adds an override set.
- Completed workouts save to Progress.
- A small `v1.5.1` marker appears near the lower-right of each page.
