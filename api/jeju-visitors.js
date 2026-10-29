// Vercel 서버리스 함수: 공공데이터포털(ODcloud) "서귀포시 직영관광지 관람객수 추이" 프록시.
// 환경변수: DATA_GO_KR_KEY  → 공공데이터포털 '일반 인증키(Decoding)'  (VITE_ 접두사 금지!)
const BASE = 'https://api.odcloud.kr/api/15125100/v1/uddi:32a1b877-af20-4505-a76a-fd389ebd30ca';

export default async function handler(req, res) {
  let key = process.env.DATA_GO_KR_KEY;
  if (!key) {
    return res.status(500).json({ code: 'NO_KEY', error: 'DATA_GO_KR_KEY 환경변수가 설정되지 않았어요.' });
  }
  // Encoding 키(%2B 같은 퍼센트 인코딩 포함)를 넣었더라도 동작하도록 한 번 풀어 준다.
  if (key.includes('%')) { try { key = decodeURIComponent(key); } catch { /* 그대로 사용 */ } }

  const url = new URL(BASE);
  url.search = new URLSearchParams({ page: '1', perPage: '200', returnType: 'JSON', serviceKey: key }).toString();

  try {
    const r = await fetch(url);
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* JSON 아님 */ }

    if (!json) return res.status(502).json({ code: 'BAD_RESPONSE', error: `공공데이터포털 응답을 해석하지 못했어요 (HTTP ${r.status}).` });
    if (!r.ok || !Array.isArray(json.data)) {
      const msg = json.msg || json.message || `공공데이터포털 오류 (HTTP ${r.status})`;
      return res.status(r.status >= 400 ? r.status : 502).json({ code: 'UPSTREAM', error: msg });
    }
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json({ total: json.totalCount ?? json.data.length, rows: json.data });
  } catch {
    return res.status(502).json({ code: 'NETWORK', error: '공공데이터포털에 연결하지 못했어요.' });
  }
}
