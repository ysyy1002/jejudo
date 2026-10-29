import { searchImages } from '../api.js';
import { mountGallery, skeleton, errorBox } from '../ui.js';
import { CATS } from './places.js';

export function renderHome(root) {
  root.innerHTML = `
    <section class="hero" id="hero">
      <div class="hero-in">
        <p class="eyebrow">JEJU ISLAND</p>
        <h1>바람, 돌, 바다,<br /><span>그리고 귤의 섬 제주</span></h1>
        <p class="lead">한라산부터 우도까지, 제주의 모습을 사진으로 둘러보고<br />마음에 드는 풍경은 로그인해서 즐겨찾기에 담아 보세요.</p>
        <div class="hero-btns">
          <a class="btn primary" href="#/places">제주 둘러보기</a>
          <a class="btn ghost" href="#/3d">🏝️ 3D로 보기</a>
          <a class="btn ghost" href="#/login?tab=signup">무료 회원가입</a>
        </div>
      </div>
    </section>
    <section class="section">
      <h2>제주의 상징들</h2>
      <div class="symbols">
        ${CATS.filter((c) => c.id !== 'all').map((c) => `<a class="symbol" href="#/places?c=${c.id}"><span class="emoji">${c.emoji}</span><b>${c.label}</b></a>`).join('')}
      </div>
    </section>
    <section class="section">
      <h2>오늘의 제주 사진</h2>
      <div class="gallery" id="homeGallery">${skeleton(8)}</div>
      <p class="credit-line">사진 제공 <a href="https://pixabay.com" target="_blank" rel="noopener">Pixabay</a></p>
    </section>`;

  const g = root.querySelector('#homeGallery');
  searchImages('jeju island', { perPage: 12 }).then((d) => {
    if (!d.hits.length) { g.innerHTML = '<p class="muted">표시할 사진이 없어요.</p>'; return; }
    const hero = root.querySelector('#hero');
    hero.style.backgroundImage = `linear-gradient(180deg, rgba(8,40,60,.35), rgba(8,40,60,.75)), url("${d.hits[0].largeImageURL}")`;
    mountGallery(g, d.hits.slice(1));
  }).catch((e) => { g.innerHTML = errorBox(e.message); });
}
