# Ben Bodybuilding Coach V1.4

Mobile-first PWA prototype.

## GitHub Pages
1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root.
3. In Settings > Pages, deploy from the main branch/root.
4. Open the resulting HTTPS URL in Safari on iPhone.
5. Share > Add to Home Screen.

## Current capabilities
- Dashboard separated from workout UI
- Training week and block priorities
- Local weight/body metrics
- Macro, InBody and progress-photo upload placeholders
- iPhone select-wheel logging for weight/reps/RIR
- Add-set override
- Exercise swaps
- Intensity-technique tags
- Automatic rest timer
- Local workout history
- Ask Coach UI ready for backend integration

## Important
Image uploads currently record the filename only. Browser localStorage cannot safely persist uploaded image files. Real InBody/macro image analysis and persistent file storage require the backend/database stage.

The Ask Coach interface intentionally does not fabricate AI responses. Connect it to a server-side endpoint so API credentials never live in the browser.
