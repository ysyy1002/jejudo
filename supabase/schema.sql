-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요.
-- 회원가입/로그인(Auth)은 Supabase가 기본 제공하므로 테이블이 따로 필요 없고,
-- 아래는 "로그인한 사용자만 사진을 즐겨찾기" 기능을 위한 테이블입니다.

create table if not exists public.favorites (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pixabay_id  bigint not null,
  image_url   text not null,
  large_url   text,
  page_url    text,
  tags        text,
  created_at  timestamptz not null default now(),
  unique (user_id, pixabay_id)
);

-- Row Level Security: 내 즐겨찾기만 보고, 추가하고, 지울 수 있어요.
alter table public.favorites enable row level security;

create policy "favorites_select_own" on public.favorites
  for select to authenticated using (auth.uid() = user_id);

create policy "favorites_insert_own" on public.favorites
  for insert to authenticated with check (auth.uid() = user_id);

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated using (auth.uid() = user_id);
