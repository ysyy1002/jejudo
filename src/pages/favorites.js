import { store, subscribe } from '../state.js';
import { esc, mountGallery } from '../ui.js';

// 로그인한 사용자만 볼 수 있는 페이지 (라우터가 비로그인이면 로그인 페이지로 보낸다)
export function renderFavorites(root) {
  const draw = () => {
    const rows = store.favRows;
    root.innerHTML = `<section class="section">
      <h2>내 즐겨찾기 <small>${rows.length}</small></h2>
      <p class="muted">${esc(store.user?.email || '')} 님이 담은 제주의 풍경이에요.</p>
      ${store.favError ? `<div class="notice error"><b>즐겨찾기를 불러오지 못했어요</b><p>${esc(store.favError)}</p><p class="small">Supabase SQL Editor에서 <code>supabase/schema.sql</code> 을 실행했는지 확인해 주세요.</p></div>` : ''}
      ${rows.length || store.favError ? '' : '<div class="notice"><b>아직 담은 사진이 없어요</b><p><a href="#/places">명소 갤러리</a>에서 ♡ 를 눌러 보세요.</p></div>'}
      <div class="gallery" id="favGallery"></div></section>`;
    const imgs = rows.map((r) => ({ id: r.pixabay_id, webformatURL: r.image_url, largeImageURL: r.large_url || r.image_url, tags: r.tags, pageURL: r.page_url }));
    mountGallery(root.querySelector('#favGallery'), imgs);
  };
  draw();
  let last = store.favRows.map((r) => r.id).join();
  return subscribe(() => { const now = store.favRows.map((r) => r.id).join(); if (now !== last) { last = now; draw(); } });
}
