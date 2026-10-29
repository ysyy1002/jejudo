-- 장바구니 기능용 테이블 (Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run)
-- 여러 번 실행해도 안전해요 (이미 있으면 건너뛰고, 정책은 다시 만들어요).
-- 선행 조건: 회원가입/로그인(auth.users)은 Supabase가 기본 제공하므로 별도 준비가 필요 없어요.

-- 1) 상품 테이블 ---------------------------------------------------------------
create table if not exists public.products (
  id           bigint generated always as identity primary key,
  name         text    not null,
  description  text,
  price        integer not null check (price >= 0),          -- 원 단위
  emoji        text    not null default '🍊',                 -- 이미지가 없을 때 보여줄 이모지
  image_url    text,                                          -- 상품 사진 주소 (선택)
  stock        integer not null default 100 check (stock >= 0),
  is_active    boolean not null default true,                 -- false 이면 쇼핑 화면에서 숨김
  created_at   timestamptz not null default now()
);

-- 2) 장바구니 테이블 -------------------------------------------------------------
create table if not exists public.cart_items (
  id          bigint generated always as identity primary key,
  user_id     uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  product_id  bigint not null references public.products (id) on delete cascade,
  quantity    integer not null default 1 check (quantity between 1 and 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, product_id)                                -- 같은 상품은 한 줄(수량 증가)
);
create index if not exists cart_items_user_idx on public.cart_items (user_id);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists cart_items_touch on public.cart_items;
create trigger cart_items_touch before update on public.cart_items
  for each row execute function public.touch_updated_at();

-- 3) Row Level Security -----------------------------------------------------------
alter table public.products   enable row level security;
alter table public.cart_items enable row level security;

-- 상품: 누구나(로그인 전에도) 볼 수 있고, 수정은 대시보드(관리자)에서만 가능해요.
drop policy if exists "products_read_all" on public.products;
create policy "products_read_all" on public.products
  for select to anon, authenticated using (is_active);

-- 장바구니: 내 것만 보고 / 담고 / 수량 바꾸고 / 지울 수 있어요.
drop policy if exists "cart_select_own" on public.cart_items;
create policy "cart_select_own" on public.cart_items
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "cart_insert_own" on public.cart_items;
create policy "cart_insert_own" on public.cart_items
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "cart_update_own" on public.cart_items;
create policy "cart_update_own" on public.cart_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cart_delete_own" on public.cart_items;
create policy "cart_delete_own" on public.cart_items
  for delete to authenticated using (auth.uid() = user_id);

-- 4) 샘플 상품 (products 가 비어 있을 때만 넣어요) ---------------------------------
insert into public.products (name, description, price, emoji, stock)
select * from (values
  ('제주 감귤 3kg',            '새콤달콤 노지 감귤, 한 박스',               15000, '🍊', 200),
  ('한라봉 2kg',               '향이 진한 프리미엄 한라봉',                  22000, '🍊', 120),
  ('천혜향 1.5kg',             '껍질이 얇고 과즙이 많은 천혜향',             25000, '🍊',  80),
  ('감귤 초콜릿',              '제주 감귤 필링이 들어간 수제 초콜릿',          9800, '🍫', 300),
  ('돌하르방 미니어처',        '책상 위 제주 수호신, 손바닥 크기',            12000, '🗿', 150),
  ('제주 말차 라떼 파우더',    '우도 땅콩/말차 블렌딩, 집에서 카페처럼',      13500, '🍵', 180),
  ('감귤 천연 비누',           '감귤 껍질 오일이 들어간 수제 비누 2개 세트',    8000, '🧼', 250),
  ('해녀 에코백',              '제주 바다를 그린 면 에코백',                  16000, '👜', 100)
) as v(name, description, price, emoji, stock)
where not exists (select 1 from public.products);
