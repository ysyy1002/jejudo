import { store, subscribe, initAuth, signOut, cartCount } from './state.js';
import { syncHearts, toast, esc } from './ui.js';
import { renderHome } from './pages/home.js';
import { renderPlaces } from './pages/places.js';
import { renderLogin } from './pages/login.js';
import { renderFavorites } from './pages/favorites.js';
import { renderShop } from './pages/shop.js';
import { renderCart } from './pages/cart.js';
import { renderVisual3D } from './pages/visual3d.js';

const app = document.getElementById('app');
app.innerHTML = `
  <header class="nav"><div class="nav-in">
    <a class="logo" href="#/">🍊 <b>제주</b> 스토리</a>
    <nav id="links"></nav>
    <div id="auth"></div>
  </div></header>
  <main id="view"></main>
  <footer class="foot">© Jeju Story · 사진 <a href="https://pixabay.com" target="_blank" rel="noopener">Pixabay</a> · 인증/DB <a href="https://supabase.com" target="_blank" rel="noopener">Supabase</a></footer>`;
const view = document.getElementById('view');

const ROUTES = {
  '/': { render: renderHome },
  '/places': { render: renderPlaces },
  '/login': { render: renderLogin },
  '/favorites': { render: renderFavorites, protected: true },
  '/3d': { render: renderVisual3D },
  '/shop': { render: renderShop },
  '/cart': { render: renderCart, protected: true },
};

function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  return { path, query: new URLSearchParams(qs || '') };
}

function renderNav() {
  const { path } = parseHash();
  const link = (href, label) => `<a href="#${href}" class="${path === href ? 'on' : ''}">${label}</a>`;
  document.getElementById('links').innerHTML = link('/', '홈') + link('/places', '명소') + link('/3d', '3D 제주') + link('/shop', '마켓') + link('/favorites', '즐겨찾기');
  const auth = document.getElementById('auth');
  const n = store.user ? cartCount() : 0;
  const cart = `<a class="cart-btn ${path === '/cart' ? 'on' : ''}" href="#/cart" aria-label="장바구니">🛒${n ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : ''}</a>`;
  if (store.user) {
    auth.innerHTML = `${cart}<span class="me" title="${esc(store.user.email)}">${esc(store.user.email.split('@')[0])}</span><button class="btn ghost small" id="logout">로그아웃</button>`;
    auth.querySelector('#logout').onclick = async () => { await signOut(); toast('로그아웃했어요.', 'ok'); location.hash = '#/'; };
  } else {
    auth.innerHTML = `${cart}<a class="btn ghost small" href="#/login">로그인</a><a class="btn primary small" href="#/login?tab=signup">회원가입</a>`;
  }
}

let cleanup = null;
function route() {
  cleanup?.(); cleanup = null;
  const { path, query } = parseHash();
  const r = ROUTES[path] || ROUTES['/'];
  renderNav();
  if (r.protected && store.ready && !store.user) { location.hash = '#/login'; toast('로그인이 필요한 페이지예요.', 'info'); return; }
  if (r.protected && !store.ready) { view.innerHTML = '<p class="muted center">불러오는 중…</p>'; return; }
  window.scrollTo(0, 0);
  cleanup = r.render(view, query) || null;
}

let lastUserId = undefined, lastReady = false;
subscribe(() => {
  const uid = store.user?.id ?? null;
  if (uid !== lastUserId || store.ready !== lastReady) {
    const first = lastUserId === undefined;
    lastUserId = uid; lastReady = store.ready;
    const { path } = parseHash();
    // 로그인 상태가 바뀌었을 때만 화면을 다시 그린다 (로그인 폼 입력값 보호)
    if (!first || path === '/favorites' || path === '/login') route(); else renderNav();
  } else { renderNav(); }
  syncHearts();
});

addEventListener('hashchange', route);
route();
initAuth();
