import { defineConfig, loadEnv } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// 로컬 개발(npm run dev) 때 Vercel 서버리스 함수(/api/*)를 흉내 내는 미들웨어.
// 배포 환경에서는 Vercel이 api/*.js 를 그대로 실행한다.
function devApi(env) {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        const name = url.pathname.replace(/^\/+/, '');
        if (!/^[a-z0-9-]+$/i.test(name) || !existsSync(resolve(process.cwd(), 'api', `${name}.js`))) return next();
        // .env.local 의 서버 전용 변수를 함수가 읽는 process.env 로 전달
        for (const k of ['PIXABAY_API_KEY', 'DATA_GO_KR_KEY']) if (env[k]) process.env[k] = env[k];
        req.query = Object.fromEntries(url.searchParams);
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (obj) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
        try {
          const { default: handler } = await import(`./api/${name}.js?t=${Date.now()}`);
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
