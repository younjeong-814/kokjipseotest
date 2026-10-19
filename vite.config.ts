import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visionOcrMiddleware } from './server/visionOcr';

// VITE_ 접두사가 없는 키는 클라이언트 번들에 포함되지 않는다.
function visionOcr(apiKey: string | undefined): Plugin {
  return {
    name: 'vision-ocr',
    configureServer: server => { server.middlewares.use('/api/ocr', visionOcrMiddleware(apiKey)); },
    configurePreviewServer: server => { server.middlewares.use('/api/ocr', visionOcrMiddleware(apiKey)); },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), visionOcr(loadEnv(mode, '.', '').GOOGLE_VISION_API_KEY)],
  base: './',
}));
