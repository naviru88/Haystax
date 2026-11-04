/**
 * Dev environment. Real values for Supabase go in environment.local.ts (git-ignored) —
 * see AGENTS-W3.md D-ENV. Never commit real keys.
 */
export const environment = {
  production: false,
  useMockApi: false,             // production-safe default; ng serve overrides this file with
                                 // environment.local.ts (angular.json → fileReplacements)
  apiBaseUrl: 'http://localhost:8080',
  supabaseUrl: '',               // placeholders — fill in environment.local.ts
  supabaseAnonKey: '',
};
