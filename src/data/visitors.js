// 서귀포시 직영관광지 관람객수 추이 (공공데이터포털 15125100)
// x: 섬 동서 방향 위치(서쪽 -, 동쪽 +, 한라산 중심=0), inland: 해안선에서 내륙 쪽으로 들어간 거리
export const SITES = [
  { id: 'sanbang', name: '산방산·용머리', match: /산방산|용머리/, x: -16.0, inland: 0.6, color: 0xff8a3d, emoji: '⛰️' },
  { id: 'jungmun', name: '중문대포 주상절리대', match: /주상절리/, x: -8.8, inland: 0, color: 0xff5fa2, emoji: '🪨' },
  { id: 'cheonje', name: '천제연폭포', match: /천제연/, x: -10.6, inland: 2.8, color: 0x4fc3f7, emoji: '💧' },
  { id: 'cheonji', name: '천지연폭포', match: /천지연/, x: -0.8, inland: 0.9, color: 0x3ddc97, emoji: '🌊' },
  { id: 'jeongbang', name: '정방폭포', match: /정방/, x: 1.6, inland: 0, color: 0xb28cff, emoji: '🏞️' },
  { id: 'citrus', name: '감귤박물관', match: /감귤박물관|감귤/, x: 5.6, inland: 3.6, color: 0xffd23f, emoji: '🍊' },
];

const num = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[,\s]/g, '');
  if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;   // 공란(데이터 미집계) 등
  return Number(s);
};

// API 행(rows)을 { periods:[{label,year,month,values:{siteId:number|null}}] } 로 바꾼다.
// 응답의 한글 컬럼명이 조금 달라도(공백/언더스코어 등) 포함 여부로 찾는다.
export function normalizeRows(rows) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const yearKey = keys.find((k) => /연도|year/i.test(k));
  const monthKey = keys.find((k) => /(^|[^가-힣])월$|기준월|month/i.test(k) && !/연도/.test(k));
  const siteKey = {};
  for (const s of SITES) siteKey[s.id] = keys.find((k) => s.match.test(k));
  const found = SITES.filter((s) => siteKey[s.id]).length;
  if (!yearKey || !monthKey || found === 0) {
    const err = new Error(`응답 컬럼을 인식하지 못했어요. (받은 컬럼: ${keys.join(', ') || '없음'})`);
    err.keys = keys;
    throw err;
  }
  const periods = rows.map((r) => {
    const year = parseInt(r[yearKey], 10), month = parseInt(r[monthKey], 10), values = {};
    for (const s of SITES) values[s.id] = siteKey[s.id] ? num(r[siteKey[s.id]]) : null;
    return { year, month, label: `${year}.${String(month).padStart(2, '0')}`, values };
  }).filter((p) => Number.isFinite(p.year) && Number.isFinite(p.month))
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));
  if (!periods.length) throw new Error('표시할 기간 데이터가 없어요.');
  return { periods, missingSites: SITES.filter((s) => !siteKey[s.id]).map((s) => s.name) };
}

// API 키를 아직 설정하지 않았을 때 화면 확인용으로만 쓰는 "예시 데이터" (실제 통계가 아니에요!)
export function sampleData() {
  const base = { sanbang: 52000, jungmun: 88000, cheonje: 61000, cheonji: 74000, jeongbang: 43000, citrus: 21000 };
  const periods = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1, season = 1 + 0.45 * Math.sin(((month - 4) / 12) * Math.PI * 2);
    const values = {};
    SITES.forEach((s, k) => { values[s.id] = Math.round(base[s.id] * season * (1 + 0.12 * Math.sin(month * (k + 1)))); });
    return { year: 2024, month, label: `2024.${String(month).padStart(2, '0')}`, values };
  });
  return { periods, missingSites: [] };
}

export async function loadVisitors() {
  let res;
  try { res = await fetch('/api/jeju-visitors'); } catch { return { ...sampleData(), source: 'sample', note: '서버에 연결하지 못해 예시 데이터를 보여드려요.' }; }
  let json = null;
  try { json = await res.json(); } catch { /* JSON 아님 */ }
  if (!res.ok || !json?.rows) {
    const why = json?.code === 'NO_KEY' ? 'DATA_GO_KR_KEY 환경변수가 아직 없어요.' : (json?.error || '데이터를 불러오지 못했어요.');
    return { ...sampleData(), source: 'sample', note: `${why} 예시 데이터를 보여드려요.` };
  }
  try {
    return { ...normalizeRows(json.rows), source: 'api', note: '' };
  } catch (e) {
    return { ...sampleData(), source: 'sample', note: `${e.message} 예시 데이터를 보여드려요.`, keys: e.keys };
  }
}
