// Vercel 서버리스 함수: Pixabay API 키를 브라우저에 노출하지 않기 위한 프록시.
// 환경변수: PIXABAY_API_KEY  (VITE_ 접두사를 붙이지 않는다!)
export default async function handler(req, res) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'PIXABAY_API_KEY 환경변수가 설정되지 않았어요.' });
  }

  const q = String(req.query.q || 'jeju island').slice(0, 100);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(40, Math.max(3, parseInt(req.query.per_page, 10) || 24));

  const url = new URL('https://pixabay.com/api/');
  url.search = new URLSearchParams({
    key,
    q,
    image_type: 'photo',
    safesearch: 'true',
    per_page: String(perPage),
    page: String(page),
  }).toString();

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const msg = r.status === 429 ? 'Pixabay 요청 한도를 넘었어요. 잠시 후 다시 시도해 주세요.' : `Pixabay 오류 (${r.status})`;
      return res.status(r.status).json({ error: msg });
    }
    const d = await r.json();
    // Pixabay 약관: 결과는 24시간 캐시하는 것이 원칙 → 엣지 캐시 사용
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json({
      total: d.totalHits,
      hits: (d.hits || []).map((h) => ({
        id: h.id,
        webformatURL: h.webformatURL,
        largeImageURL: h.largeImageURL,
        tags: h.tags,
        user: h.user,
        pageURL: h.pageURL,
      })),
    });
  } catch (e) {
    return res.status(502).json({ error: 'Pixabay에 연결하지 못했어요.' });
  }
}
