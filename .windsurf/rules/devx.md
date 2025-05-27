---
trigger: always_on
description: General recommendations & caveats
---

- Standalone React UI project doesn't need to be restarted, as there's hot reloading.
- Regarding the server, I want to restart it myself, so don't run npx bun dev yourself but ask me to.
- Regarding the extension/ folder, you don't need to compile changes with npm run build. We're doing that anyways already with `npm run dev`.

- Regarding product & UX choices: DON'T take deviating UX decisions without verifying without me that's acceptable.