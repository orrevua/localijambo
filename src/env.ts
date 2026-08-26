function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Set it in your .env (see .env.example).`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl(): string {
    return required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
  },
  get supabaseAnonKey(): string {
    return required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY);
  },
};
