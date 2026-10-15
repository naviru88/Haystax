/**
 * Dev environment. Real values for Supabase go in environment.local.ts (git-ignored) —
 * see AGENTS-W3.md D-ENV. Never commit real keys.
 */
export const environment = {
  production: false,
  useMockApi: false,             // true -> MockAuthService + fixtures, no network
  apiBaseUrl: 'http://localhost:8080',
  supabaseUrl: '',               // placeholders — fill in environment.local.ts
  supabaseAnonKey: '',
};
