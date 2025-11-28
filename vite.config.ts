import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    // const env = loadEnv(mode, '.', ''); // <-- Pode remover essa linha se quiser
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          // ... suas configs do PWA (não mude nada aqui)
        })
      ],
      // REMOVA O BLOCO "define" INTEIRO DAQUI
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});