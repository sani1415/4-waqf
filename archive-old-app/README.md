# Archived old app (HTML / JS / CSS)

This folder contains the **previous web app** that was deployed to https://waqful-madinah.web.app/ before switching to the Next.js app.

- **index.html** – Landing + login
- **pages/** – Teacher/student HTML pages
- **js/** – Scripts (data-manager, auth, i18n, etc.)
- **css/** – Styles (common, teacher, student, messaging, etc.)
- **locales/** – en.json, bn.json

The **live site** now serves the Next.js app from the repo root (`next-app`). Deploy with:

```bash
npm run deploy
```

(from repo root; this builds `next-app` and deploys `next-app/out` to Firebase Hosting.)
