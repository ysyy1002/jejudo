import { store, subscribe, setQty, removeItem, clearCart, cartSubtotal, shippingFee, SHIPPING } from '../state.js';
import { esc, toast } from '../ui.js';
import { won, productThumb } from './shop.js';

// 로그인한 사용자만 접근 (라우터가 보호)
export function renderCart(root) {
  const draw = () => {
    const items = store.cart, sub = cartSubtotal(), ship = shippingFee();
    root.innerHTML = `<section class="section">
      <h2>장바구니 <small>${items.length}</small></h2>
      ${store.cartError ? `<div class="notice error"><b>장바구니를 불러오지 못했어요</b><p>${esc(store.cartError)}</p><p class="small">Supabase SQL Editor에서 <code>supabase/cart.sql</code> 을 실행했는지 확인해 주세요.</p></div>` : ''}
      ${items.length ? `
      <div class="cart-layout">
        <ul class="cart-list">${items.map((it) => { const p = it.products || {}; return `
          <li class="cart-row" data-id="${it.id}">
            <div class="cthumb">${productThumb(p)}</div>
            <div class="cinfo"><b>${esc(p.name || '(삭제된 상품)')}</b><span class="muted small">${won(p.price)}</span></div>
            <div class="qty"><button data-dec aria-label="줄이기">−</button><span>${it.quantity}</span><button data-inc aria-label="늘리기">＋</button></div>
            <b class="line">${won((p.price || 0) * it.quantity)}</b>
            <button class="rm" data-rm aria-label="삭제">✕</button>
          </li>`; }).join('')}</ul>
        <aside class="summary">
          <h3>주문 요약</h3>
          <dl><dt>상품 금액</dt><dd>${won(sub)}</dd><dt>배송비</dt><dd>${ship ? won(ship) : '무료'}</dd></dl>
          ${ship ? `<p class="small muted">${won(SHIPPING.freeOver - sub)} 더 담으면 배송비 무료!</p>` : ''}
          <div class="total"><span>총 결제 예정</span><b>${won(sub + ship)}</b></div>
          <button class="btn primary block" id="checkout">주문하기</button>
          <button class="btn ghost dark block" id="clear">장바구니 비우기</button>
        </aside>
      </div>` : (store.cartError ? '' : '<div class="notice"><b>장바구니가 비어 있어요</b><p><a href="#/shop">제주 마켓</a>에서 상품을 담아 보세요.</p></div>')}
    </section>`;
  };
  draw();

  const onClick = async (e) => {
    const row = e.target.closest('.cart-row');
    if (row) {
      const id = Number(row.dataset.id), it = store.cart.find((i) => i.id === id); if (!it) return;
      let r = {};
      if (e.target.closest('[data-inc]')) r = await setQty(id, it.quantity + 1);
      else if (e.target.closest('[data-dec]')) r = await setQty(id, it.quantity - 1);
      else if (e.target.closest('[data-rm]')) r = await removeItem(id);
      if (r.error) toast(r.error, 'error');
      return;
    }
    if (e.target.closest('#clear')) { if (confirm('장바구니를 모두 비울까요?')) { const r = await clearCart(); if (r.error) toast(r.error, 'error'); } }
    if (e.target.closest('#checkout')) toast('주문/결제 기능은 아직 준비 중이에요 🍊', 'info');
  };
  root.addEventListener('click', onClick);

  let last = JSON.stringify(store.cart.map((i) => [i.id, i.quantity]));
  const off = subscribe(() => { const now = JSON.stringify(store.cart.map((i) => [i.id, i.quantity])); if (now !== last) { last = now; draw(); } });
  return () => { off(); root.removeEventListener('click', onClick); };
}
