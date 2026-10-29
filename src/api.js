// Pixabay는 /api/pixabay (서버리스 함수)를 통해서만 호출한다. API 키는 서버에만 있다.
export async function searchImages(q, { page = 1, perPage = 24 } = {}) {
  const params = new URLSearchParams({ q, page: String(page), per_page: String(perPage) });
  let res;
  try {
    res = await fetch(`/api/pixabay?${params}`);
  } catch {
    throw new Error('서버에 연결하지 못했어요.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* JSON이 아닌 응답 */ }
  if (!res.ok || !data) throw new Error(data?.error || '사진을 불러오지 못했어요. (/api/pixabay)');
  return data; // { total, hits: [...] }
}
