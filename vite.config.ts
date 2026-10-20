import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visionOcrMiddleware } from './server/visionOcr';
import { recipesMiddleware } from './server/recipes';

function recipeApi(foodSafetyKey: string | undefined, mafraKey: string | undefined): Plugin {
  const middleware = recipesMiddleware(foodSafetyKey, mafraKey);
  return {
    name: 'hybrid-recipes',
    configureServer: server => { server.middlewares.use('/api/recipes', middleware); },
    configurePreviewServer: server => { server.middlewares.use('/api/recipes', middleware); },
  };
}

// VITE_ 접두사가 없는 키는 클라이언트 번들에 포함되지 않는다.
function visionOcr(apiKey: string | undefined): Plugin {
  return {
    name: 'vision-ocr',
    configureServer: server => { server.middlewares.use('/api/ocr', visionOcrMiddleware(apiKey)); },
    configurePreviewServer: server => { server.middlewares.use('/api/ocr', visionOcrMiddleware(apiKey)); },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), visionOcr(env.GOOGLE_VISION_API_KEY), recipeApi(env.FOOD_SAFETY_API_KEY, env.FOOD_API_KEY)],
    base: './',
  };
});
