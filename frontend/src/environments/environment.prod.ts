export const environment = {
  production: true,
  useMockApi: false,
  apiBaseUrl: '/api',            // same-origin through nginx in prod
  supabaseUrl: '',               // supplied at deploy time
  supabaseAnonKey: '',
};
