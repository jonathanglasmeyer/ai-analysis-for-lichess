---
trigger: always_on
description: General recommendations & caveats
---

- Standalone React UI project doesn't need to be restarted, as there's hot reloading.
- Regarding the server, I want to restart it myself, so don't run npx bun dev yourself but ask me to.
- Regarding the extension, we're already watching for changes in the terminal, and compile; so you don't need to `npm run build`.

- Regarding product & UX choices: DON'T take deviating UX decisions without verifying without me that's acceptable.