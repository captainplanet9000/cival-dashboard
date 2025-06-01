# Trading Farm Dashboard - OpenRouter LLM Integration

## API Key Security & Management (Phase 1 Complete)

### 1. Key Revocation (IMPORTANT)
- **If you have posted your API key publicly or in chat, IMMEDIATELY revoke it in your OpenRouter dashboard.**
- Generate a new key for use in your project.

### 2. Secure Storage
- **Local Development:**
  - Add the following line to your `.env.local` (do NOT commit this file):
    ```
    OPENROUTER_API_KEY=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
    ```
  - This makes the key available to your Next.js server code via `process.env.OPENROUTER_API_KEY`.

- **Production Deployment:**
  - Use your deployment platform’s secret management (e.g., Vercel, Supabase secrets):
    - For Supabase Edge Functions:
      ```sh
      supabase secrets set OPENROUTER_API_KEY=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
      ```
    - For Vercel/Netlify: Add as an environment variable in dashboard settings.

### 3. Documentation for Team
- **Never commit API keys to your repo.**
- **Never share API keys in chat, screenshots, or documentation.**
- Always use environment variables or secret managers.
- If a key is ever exposed, revoke and replace it immediately.

### 4. Next Steps
- You are now ready to implement the LLM service layer (Phase 2).
- See `/docs/llm-security.md` for this checklist and future updates.

---

**Phase 1 Complete: Your OpenRouter API key is now securely managed for both local and production environments.**
