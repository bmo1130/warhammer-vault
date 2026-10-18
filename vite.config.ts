import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/warhammer-vault/',

  optimizeDeps: {
    entries: ['index.html'],
  },

  server: {
    watch: {
      ignored: [
        '**/generated/**',
        '**/.test-build/**',
      ],
    },
  },
});