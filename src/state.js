import { supabase } from './supabase.js';

// 앱 전체에서 공유하는 간단한 스토어 (로그인 사용자 + 즐겨찾기)
export const store = { user: null, ready: false, favs: new Map(), favRows: [], favError: null, cart: [], cartError: null };

const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((fn) => fn());

async function setUser(user) {
  store.user = user;
  store.favs = new Map();
  store.favRows = [];
  store.favError = null;
  store.cart = [];
  store.cartError = null;
  emit();
  if (user) await Promise.all([loadFavs(), loadCart()]);
  store.ready = true;
  emit();
}

export async function initAuth() {
  if (!supabase) { store.ready = true; emit(); return; }
  const { data } = await supabase.auth.getSession();
  await setUser(data.session?.user ?? null);
  supabase.auth.onAuthStateChange((_event, session) => {
    // 콜백 안에서 바로 supabase를 await 하면 교착될 수 있어서 한 틱 미룬다.
    setTimeout(() => {
      const u = session?.user ?? null;
      if (u?.id !== store.user?.id) setUser(u);
    }, 0);
  });
}

export async function loadFavs() {
  const { data, error } = await supabase.from('favorites').select('*').order('created_at', { ascending: false });
  if (error) { store.favError = error.message; return; }
  store.favRows = data;
  store.favs = new Map(data.map((r) => [Number(r.pixabay_id), r]));
}

export async function toggleFav(img) {
  if (!store.user) return { needLogin: true };
  const id = Number(img.id);
  const existing = store.favs.get(id);
  if (existing) {
    const { error } = await supabase.from('favorites').delete().eq('id', existing.id);
    if (error) return { error: error.message };
    store.favs.delete(id);
    store.favRows = store.favRows.filter((r) => r.id !== existing.id);
  } else {
    const { data, error } = await supabase.from('favorites').insert({
      pixabay_id: id,
      image_url: img.webformatURL,
      large_url: img.largeImageURL || img.webformatURL,
      page_url: img.pageURL || '',
      tags: img.tags || '',
    }).select().single();
    if (error) return { error: error.message };
    store.favs.set(id, data);
    store.favRows = [data, ...store.favRows];
  }
  emit();
  return { ok: true, added: !existing };
}

// ---------- 장바구니 ----------
const CART_SELECT = 'id, product_id, quantity, products(id, name, description, price, emoji, image_url)';
export const SHIPPING = { fee: 3000, freeOver: 30000 };

export async function loadCart() {
  const { data, error } = await supabase.from('cart_items').select(CART_SELECT).order('created_at', { ascending: true });
  if (error) { store.cartError = error.message; return; }
  store.cart = data;
}
export const cartCount = () => store.cart.reduce((n, i) => n + i.quantity, 0);
export const cartSubtotal = () => store.cart.reduce((s, i) => s + i.quantity * (i.products?.price || 0), 0);
export const shippingFee = () => (store.cart.length === 0 || cartSubtotal() >= SHIPPING.freeOver ? 0 : SHIPPING.fee);

export async function addToCart(product) {
  if (!store.user) return { needLogin: true };
  const ex = store.cart.find((i) => i.product_id === product.id);
  if (ex) return setQty(ex.id, ex.quantity + 1);
  const { data, error } = await supabase.from('cart_items').insert({ product_id: product.id, quantity: 1 }).select(CART_SELECT).single();
  if (error) return { error: error.message };
  store.cart = [...store.cart, data];
  emit();
  return { ok: true };
}
export async function setQty(itemId, qty) {
  const it = store.cart.find((i) => i.id === itemId);
  if (!it) return {};
  if (qty < 1) return removeItem(itemId);
  if (qty > 99) return { error: '한 상품은 최대 99개까지 담을 수 있어요.' };
  const { error } = await supabase.from('cart_items').update({ quantity: qty }).eq('id', itemId);
  if (error) return { error: error.message };
  it.quantity = qty;
  emit();
  return { ok: true };
}
export async function removeItem(itemId) {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
  if (error) return { error: error.message };
  store.cart = store.cart.filter((i) => i.id !== itemId);
  emit();
  return { ok: true };
}
export async function clearCart() {
  const { error } = await supabase.from('cart_items').delete().eq('user_id', store.user.id);
  if (error) return { error: error.message };
  store.cart = [];
  emit();
  return { ok: true };
}

// 로그인 직후 화면 이동 전에, 스토어에 사용자 정보가 반영될 때까지 잠깐 기다린다.
export function whenUser(timeout = 3000) {
  return new Promise((resolve) => {
    if (store.user) return resolve();
    const off = subscribe(() => { if (store.user) { off(); resolve(); } });
    setTimeout(() => { off(); resolve(); }, timeout);
  });
}

export async function signOut() {
  await supabase?.auth.signOut();
}
