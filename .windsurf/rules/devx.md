---
trigger: always_on
description: General recommendations & caveats
---

- Standalone React UI project doesn't need to be restarted, as there's hot reloading.
- Regarding the server, I want to restart it myself, so don't run npx bun dev yourself but ask me to.
- Regarding deploying the server (using deploy.sh or update.sh): don't do it yourself, but let me do it. 
- Regarding the extension/ folder, you don't need to compile changes with npm run build. We're doing that anyways already with `npm run dev`.

- Regarding product & UX choices: DON'T take deviating UX decisions without verifying without me that's acceptable.
- Don't start fixing lint errors when you have a product goal from me, as it can lead to new errors, messing everything up.
- Technische Implementationen die du als geeignet empfindest, bitte immer direkt umsetzen, nicht immer noch mal ne Abfrage ob du es wirklich tun sollst.
- Nie einfach das cache/ directory löschen, insb. auf dem Server!!