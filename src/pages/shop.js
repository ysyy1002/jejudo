import { supabase, configured } from '../supabase.js';
import { store, subscribe, addToCart } from '../state.js';
import { esc, toast } from '../ui.js';

export const won = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');

export function productThumb(p) {
  return p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" />` : `<span class="emoji-art">${esc(p.emoji || '🍊')}</span>`;
}

export function renderShop(root) {
  if (!configured) {
    root.innerHTML = `<section class="section narrow"><div class="notice error"><b>Supabase 환경변수가 아직 없어요</b><p>상품은 Supabase에서 불러와요. README의 환경변수 설정을 먼저 해주세요.</p></div></section>`;
    return;
  }
  root.innerHTML = `<section class="section">
    <h2>제주 마켓 🍊</h2>
    <p class="muted">제주의 맛과 기념품을 담아 보세요. 3만 원 이상 구매하면 배송비가 무료예요.</p>
    <div id="shopMsg"></div>
    <div class="products" id="products"><div class="pcard sk"></div><div class="pcard sk"></div><div class="pcard sk"></div><div class="pcard sk"></div></div>
  </section>`;
  const box = root.querySelector('#products'), msg = root.querySelector('#shopMsg');
  let products = [];

  const inCart = (id) => store.cart.find((i) => i.product_id === id)?.quantity || 0;
  const draw = () => {
    box.innerHTML = products.map((p) => {
      const n = inCart(p.id), soldOut = p.stock <= 0;
      return `<article class="pcard">
        <div class="pthumb">${productThumb(p)}</div>
        <div class="pbody">
          <h3>${esc(p.name)}</h3>
          <p class="muted small">${esc(p.description || '')}</p>
          <div class="prow"><b class="price">${won(p.price)}</b>
            <button class="btn primary small" data-add="${p.id}" ${soldOut ? 'disabled' : ''}>${soldOut ? '품절' : n ? `담기 (+1) · ${n}개` : '🛒 담기'}</button></div>
        </div></article>`;
    }).join('');
  };

  supabase.from('products').select('*').eq('is_active', true).order('id').then(({ data, error }) => {
    if (error) {
      box.innerHTML = '';
      msg.innerHTML = `<div class="notice error"><b>상품을 불러오지 못했어요</b><p>${esc(error.message)}</p><p class="small">Supabase SQL Editor에서 <code>supabase/cart.sql</code> 을 실행했는지 확인해 주세요.</p></div>`;
      return;
    }
    products = data;
    if (!products.length) { box.innerHTML = '<p class="muted">등록된 상품이 없어요.</p>'; return; }
    draw();
  });

  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    const p = products.find((x) => String(x.id) === b.dataset.add); if (!p) return;
    b.disabled = true;
    const r = await addToCart(p);
    b.disabled = false;
    if (r.needLogin) { toast('로그인하면 장바구니를 쓸 수 있어요 🍊', 'info'); setTimeout(() => { location.hash = '#/login'; }, 700); return; }
    if (r.error) { toast(`담지 못했어요: ${r.error}`, 'error'); return; }
    toast(`🛒 ${p.name} 담았어요`, 'ok');
  });
  return subscribe(() => { if (products.length) draw(); });
}
