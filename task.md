# AI Patch Assistant Integration (v3.5)

- `[x]` **Phase 1: Setup Zustand Store (store.js)**
  - `[x]` Add `geminiApiKey` state variable to Zustand
  - `[x]` Add `setGeminiApiKey` action
  - `[x]` Modify `loadSettings` to retrieve `geminiApiKey` from `chrome.storage.local`
  - `[x]` Sync changes to `geminiApiKey` in the storage onChanged listener

- `[x]` **Phase 2: Build Settings UI (Options.jsx)**
  - `[x]` Add Gemini API Key input card beneath Webhook settings
  - `[x]` Bind state handlers and save actions for `geminiApiKey`

- `[x]` **Phase 3: Integrate AI Patch Engine & UI (DataTreeTab.jsx)**
  - `[x]` Implement prompt generator function (minimal context, listing only missing keys)
  - `[x]` Add visual **"🤖 AI Patch Assistant"** block under each detected form
  - `[x]` Design **"Copy Prompt"** action with interactive "Copied!" checkmark
  - `[x]` Design **"Generate Code Patch"** API request flow (checking `window.ai` first, then API key)
  - `[x]` Implement loading skeleton loaders during AI generation
  - `[x]` Implement error boundary display matching HTTP status codes
  - `[x]` Design generated code layout with a one-click copy button

- `[x]` **Phase 4: Verification**
  - `[x]` Verify prompt generation logic
  - `[x]` Compile production bundle (`npm run build`)
