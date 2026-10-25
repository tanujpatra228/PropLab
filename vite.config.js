import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // three.js alone is ~600 kB; keep it in its own long-cached chunk
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        advancedChunks: { groups: [{ name: 'three', test: /node_modules[\\/]three/ }] }
      }
    }
  }
});
