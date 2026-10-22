import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Deployed on Vercel: SPA routes are rewritten to index.html in vercel.json.
export default defineConfig({
  base: '/',
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
