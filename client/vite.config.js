import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const API = 'http://localhost:3000'

export default defineConfig({
  // HTTPS: el navegador solo permite usar el micrófono en localhost o con HTTPS
  plugins: [react(), basicSsl()],
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'socket.io-client', 'lucide-react'],
  },
  server: {
    port: 5173,
    host: true, // accesible desde otras computadoras de la red
    // El cliente usa rutas relativas y Vite las reenvía al servidor Express
    proxy: {
      '/api': API,
      '/uploads': API,
      '/socket.io': { target: API, ws: true },
    },
  },
})
