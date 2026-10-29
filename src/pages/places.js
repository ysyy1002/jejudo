import { searchImages } from '../api.js';
import { mountGallery, skeleton, errorBox } from '../ui.js';

export const CATS = [
  { id: 'all', label: '전체', emoji: '🌺', q: 'jeju island' },
  { id: 'hallasan', label: '한라산', emoji: '🏔️', q: 'hallasan mountain jeju' },
  { id: 'seongsan', label: '성산일출봉', emoji: '🌅', q: 'seongsan ilchulbong' },
  { id: 'udo', label: '우도', emoji: '🏝️', q: 'udo island jeju' },
  { id: 'tangerine', label: '감귤', emoji: '🍊', q: 'jeju tangerine mandarin' },
  { id: 'hareubang', label: '돌하르방', emoji: '🗿', q: 'dol hareubang jeju' },
  { id: 'haenyeo', label: '해녀', emoji: '🤿', q: 'haenyeo jeju' },
  { id: 'oreum', label: '오름', emoji: '⛰️', q: 'jeju oreum' },
  { id: 'beach', label: '해변', emoji: '🏖️', q: 'jeju beach' },
];

export function renderPlaces(root, query) {
  let cat = CATS.find((c) => c.id === query.get('c')) || CATS[0];
  let page = 1, loading = false;

  root.innerHTML = `
    <section class="section">
      <h2>제주 명소 갤러리</h2>
      <div class="chips" id="chips">
        ${CATS.map((c) => `<button class="chip" data-c="${c.id}">${c.emoji} ${c.label}</button>`).join('')}
      </div>
      <div class="gallery" id="gallery"></div>
      <div class="more"><button class="btn primary" id="more" hidden>더 보기</button></div>
      <p class="credit-line">사진 제공 <a href="https://pixabay.com" target="_blank" rel="noopener">Pixabay</a></p>
    </section>`;

  const gallery = root.querySelector('#gallery'), more = root.querySelector('#more'), chips = root.querySelector('#chips');
  const markChips = () => chips.querySelectorAll('.chip').forEach((b) => b.classList.toggle('on', b.dataset.c === cat.id));

  async function load(reset) {
    if (loading) return; loading = true;
    if (reset) { page = 1; gallery.innerHTML = skeleton(8); more.hidden = true; }
    try {
      const d = await searchImages(cat.q, { page, perPage: 24 });
      if (reset && !d.hits.length) { gallery.innerHTML = '<p class="muted">사진이 없어요.</p>'; return; }
      mountGallery(gallery, d.hits, { append: !reset });
      more.hidden = page * 24 >= d.total;
    } catch (e) {
      if (reset) gallery.innerHTML = errorBox(e.message);
    } finally { loading = false; }
  }

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    cat = CATS.find((c) => c.id === b.dataset.c); markChips(); load(true);
  });
  more.addEventListener('click', () => { page += 1; load(false); });
  markChips(); load(true);
}
