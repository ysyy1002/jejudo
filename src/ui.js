import { store, toggleFav } from './state.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2800);
}

const firstTags = (tags) => String(tags || '').split(',').slice(0, 2).join(' · ');

function heartHTML(id) {
  const on = store.favs.has(Number(id));
  return `<button class="heart ${on ? 'on' : ''}" data-heart="${id}" aria-label="즐겨찾기">${on ? '♥' : '♡'}</button>`;
}

export function cardHTML(img) {
  return `<figure class="card" data-id="${img.id}">
    <img loading="lazy" src="${esc(img.webformatURL)}" alt="${esc(img.tags)}" />
    <figcaption>${esc(firstTags(img.tags))}</figcaption>
    ${heartHTML(img.id)}
  </figure>`;
}

// 갤러리: 카드 클릭 → 큰 사진 모달, 하트 클릭 → 즐겨찾기 토글
export function mountGallery(container, images, { append = false } = {}) {
  if (!container._images) container._images = new Map();
  if (!append) { container._images.clear(); container.innerHTML = ''; }
  images.forEach((i) => container._images.set(String(i.id), i));
  container.insertAdjacentHTML('beforeend', images.map(cardHTML).join(''));
  if (!container._bound) {
    container._bound = true;
    container.addEventListener('click', async (e) => {
      const heart = e.target.closest('[data-heart]');
      const card = e.target.closest('.card');
      if (heart) { e.stopPropagation(); await handleHeart(container._images.get(heart.dataset.heart)); return; }
      if (card) openModal(container._images.get(card.dataset.id));
    });
  }
}

export async function handleHeart(img) {
  if (!img) return;
  const r = await toggleFav(img);
  if (r.needLogin) { toast('로그인하면 즐겨찾기를 할 수 있어요 🍊', 'info'); setTimeout(() => { location.hash = '#/login'; closeModal(); }, 700); return; }
  if (r.error) { toast(`저장하지 못했어요: ${r.error}`, 'error'); return; }
  toast(r.added ? '즐겨찾기에 담았어요 ♥' : '즐겨찾기에서 뺐어요', 'ok');
}

// 하트 상태를 현재 스토어에 맞게 갱신 (화면 전체)
export function syncHearts() {
  document.querySelectorAll('[data-heart]').forEach((b) => {
    const on = store.favs.has(Number(b.dataset.heart));
    b.classList.toggle('on', on);
    if (!b.classList.contains('wide')) b.textContent = on ? '♥' : '♡'; else b.textContent = on ? '♥ 즐겨찾기 해제' : '♡ 즐겨찾기';
  });
}

let modalEl = null;
export function closeModal() { modalEl?.remove(); modalEl = null; document.body.classList.remove('no-scroll'); }
export function openModal(img) {
  if (!img) return;
  closeModal();
  const on = store.favs.has(Number(img.id));
  modalEl = document.createElement('div');
  modalEl.className = 'modal';
  modalEl.innerHTML = `<div class="modal-box">
    <button class="modal-x" aria-label="닫기">✕</button>
    <img src="${esc(img.largeImageURL || img.webformatURL)}" alt="${esc(img.tags)}" />
    <div class="modal-info">
      <div class="tags">${String(img.tags || '').split(',').filter(Boolean).slice(0, 6).map((t) => `<span>#${esc(t.trim())}</span>`).join('')}</div>
      <div class="modal-actions">
        <button class="btn primary heart wide ${on ? 'on' : ''}" data-heart="${img.id}">${on ? '♥ 즐겨찾기 해제' : '♡ 즐겨찾기'}</button>
        ${img.pageURL ? `<a class="credit" href="${esc(img.pageURL)}" target="_blank" rel="noopener">Pixabay${img.user ? ' · ' + esc(img.user) : ''} ↗</a>` : ''}
      </div>
    </div>
  </div>`;
  modalEl.addEventListener('click', async (e) => {
    if (e.target === modalEl || e.target.closest('.modal-x')) { closeModal(); return; }
    if (e.target.closest('[data-heart]')) await handleHeart(img);
  });
  document.body.appendChild(modalEl);
  document.body.classList.add('no-scroll');
}
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

export const skeleton = (n = 8) => Array.from({ length: n }, () => '<div class="card sk"></div>').join('');
export const errorBox = (msg) => `<div class="notice error"><b>😢 사진을 불러오지 못했어요</b><p>${esc(msg)}</p><p class="small">README의 환경변수 설정(PIXABAY_API_KEY)을 확인해 주세요.</p></div>`;
