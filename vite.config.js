import { defineConfig, loadEnv } from 'vite';

// 로컬 개발(npm run dev) 때 Vercel 서버리스 함수(/api/pixabay)를 흉내 내는 미들웨어.
// 배포 환경에서는 Vercel이 api/pixabay.js를 그대로 실행한다.
function devApi(env) {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/pixabay', async (req, res) => {
        process.env.PIXABAY_API_KEY = env.PIXABAY_API_KEY || process.env.PIXABAY_API_KEY || '';
        const url = new URL(req.url, 'http://localhost');
        req.query = Object.fromEntries(url.searchParams);
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (obj) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
        try {
          const { default: handler } = await import('./api/pixabay.js');
          await handler(req, res);
        } catch (e) {
          res.status(500).json({ error: String(e?.message || e) });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [devApi(env)] };
});
