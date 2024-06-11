// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  // alias @
  resolve: {
    alias: {
      '@': '/src'
    }
  }
  
});