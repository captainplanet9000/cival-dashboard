# ElizaOS LLM Integration Guide

## Overview
This guide explains how to configure and use the ElizaOS AI Command Console with dynamic LLM provider/model selection (OpenRouter, OpenAI) in the Trading Farm Dashboard.

---

## 1. API Key Configuration

### OpenRouter
- **Get an API key:** [OpenRouter.ai](https://openrouter.ai/)
- **Set in `.env.local`:**
  ```env
  OPENROUTER_API_KEY=sk-or-...
  ```

### OpenAI
- **Get an API key:** [OpenAI Platform](https://platform.openai.com/)
- **Set in `.env.local`:**
  ```env
  OPENAI_API_KEY=sk-...
  ```

> **Security:** Never commit API keys to version control. Keep `.env.local` in your `.gitignore`.

---

## 2. Provider/Model Selection in the UI
- Open the ElizaOS Command Console.
- Click the chevron next to the input to reveal advanced options.
- Select your desired **Provider** (OpenRouter or OpenAI).
- The **Model** dropdown will update with available models for the selected provider.
- Enter your command and click **Send**.
- The chat will display which provider/model was used for each response.

---

## 3. Backend API Route
- All chat/command requests are sent to `/api/elizaos/intent/route.ts`.
- The backend uses the selected provider/model, defaulting to OpenRouter/GPT-4o.
- API keys are securely loaded from environment variables.

---

## 4. Testing
- See `src/components/elizaos/command-console.test.tsx` for component tests.
- Tests cover UI rendering, advanced controls, provider/model selection, and LLM response display.
- Run tests with:
  ```sh
  npm test
  # or
  npx vitest
  ```

---

## 5. Troubleshooting
- If you see an error about missing API keys, ensure `.env.local` is set and the app is restarted.
- For advanced model support, check OpenRouter docs for available models.
- If you encounter CORS or network errors, verify your backend endpoint and referer settings.

---

## 6. Security Best Practices
- **Never expose API keys in frontend code.**
- Use environment variables for all sensitive credentials.
- Rotate keys regularly and monitor usage.

---

For further help, see the main README or contact the project maintainer.
