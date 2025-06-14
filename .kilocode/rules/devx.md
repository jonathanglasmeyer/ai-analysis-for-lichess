- Regarding the server, I want to restart it myself, so don't run npx bun dev yourself but ask me to.
- Regarding deploying the server (using deploy.sh or update.sh): don't do it yourself, but let me do it. 
- Regarding the extension/ folder, you don't need to compile changes with npm run build. We're doing that anyways already with `npm run dev`.

- Regarding product & UX choices: DON'T take deviating UX decisions without verifying without me that's acceptable.
- Don't start fixing lint errors when you have a product goal from me, as it can lead to new errors, messing everything up.
- UI-Strings in der Extension werden mit **I18 Next** implementiert. Strings in extension/src/i18n.ts
- Nie einfach das cache/ directory löschen, insb. auf dem Server!!