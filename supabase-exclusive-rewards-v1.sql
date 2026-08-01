-- LAST NIGHT SURVIVAL — EXCLUSIVE REWARDS V1
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.
-- Phần thưởng được gắn theo public.player_profiles.id, KHÔNG theo tên hiển thị.

begin;

create table if not exists public.player_reward_unlocks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null
    references public.player_profiles(id)
    on delete cascade,
  reward_type text not null
    check (reward_type in ('skin', 'ability')),
  reward_id text not null,
  note text,
  granted_at timestamptz not null default now(),
  unique (player_id, reward_type, reward_id)
);

create index if not exists player_reward_unlocks_player_id_idx
  on public.player_reward_unlocks(player_id);

alter table public.player_reward_unlocks enable row level security;

-- Không cho client đọc/ghi trực tiếp bảng quà.
-- Client chỉ được đọc quà của chính hồ sơ hiện tại qua RPC bảo mật phía dưới.
revoke all on table public.player_reward_unlocks from anon, authenticated;

create or replace function public.get_my_reward_unlocks_v1()
returns table (
  reward_type text,
  reward_id text,
  note text,
  granted_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    rewards.reward_type,
    rewards.reward_id,
    rewards.note,
    rewards.granted_at
  from public.player_reward_unlocks as rewards
  inner join public.player_profiles as profiles
    on profiles.id = rewards.player_id
  where profiles.owner_id = auth.uid()
  order by rewards.granted_at asc;
$$;

revoke all on function public.get_my_reward_unlocks_v1() from public;
grant execute on function public.get_my_reward_unlocks_v1() to authenticated;

commit;

-- ================================================================
-- ID PHẦN THƯỞNG HỢP LỆ
-- ================================================================
-- SKIN:
--   supreme-champion      | Vương Giả Tối Thượng
--   void-conqueror        | Chinh Phục Hư Không
--   last-night-overlord   | Bá Chủ Đêm Cuối
--
-- KỸ NĂNG:
--   supreme-starfall      | Thiên Vẫn Tối Thượng
--   void-dominion         | Vương Quyền Hư Không
--   last-night-verdict    | Phán Quyết Đêm Cuối

-- ================================================================
-- 1) TÌM ID HỒ SƠ THEO TÊN
-- ================================================================
-- select id, display_name, owner_id, created_at
-- from public.player_profiles
-- where lower(display_name) = lower('TEN_NGUOI_CHOI');

-- ================================================================
-- 2) TRAO MỘT SKIN
-- ================================================================
-- insert into public.player_reward_unlocks (
--   player_id, reward_type, reward_id, note
-- ) values (
--   'UUID_HO_SO_CUA_NGUOI_CHOI',
--   'skin',
--   'supreme-champion',
--   'Thưởng Top 1 mùa 1'
-- )
-- on conflict (player_id, reward_type, reward_id) do nothing;

-- ================================================================
-- 3) TRAO MỘT KỸ NĂNG
-- ================================================================
-- insert into public.player_reward_unlocks (
--   player_id, reward_type, reward_id, note
-- ) values (
--   'UUID_HO_SO_CUA_NGUOI_CHOI',
--   'ability',
--   'supreme-starfall',
--   'Thưởng Top 1 mùa 1'
-- )
-- on conflict (player_id, reward_type, reward_id) do nothing;

-- ================================================================
-- 4) TRAO CẢ BỘ VƯƠNG GIẢ TỐI THƯỢNG
-- ================================================================
-- insert into public.player_reward_unlocks (
--   player_id, reward_type, reward_id, note
-- ) values
--   ('UUID_HO_SO_CUA_NGUOI_CHOI', 'skin', 'supreme-champion', 'Bộ độc quyền Top 1'),
--   ('UUID_HO_SO_CUA_NGUOI_CHOI', 'ability', 'supreme-starfall', 'Bộ độc quyền Top 1')
-- on conflict (player_id, reward_type, reward_id) do nothing;

-- ================================================================
-- 5) TRAO CẢ 6 PHẦN THƯỞNG CHO MỘT ID
-- ================================================================
-- insert into public.player_reward_unlocks (
--   player_id, reward_type, reward_id, note
-- ) values
--   ('UUID_HO_SO_CUA_NGUOI_CHOI', 'skin', 'supreme-champion', 'Admin gift'),
--   ('UUID_HO_SO_CUA_NGUOI_CHOI', 'skin', 'void-conqueror', 'Admin gift'),
--   ('UUID_HO_SO_CUA_NGUOI_CHOI', 'skin', 'last-night-overlord', 'Admin gift'),
--   ('UUID_HO_SO_CUA_NGUOI_CHOI', 'ability', 'supreme-starfall', 'Admin gift'),
--   ('UUID_HO_SO_CUA_NGUOI_CHOI', 'ability', 'void-dominion', 'Admin gift'),
--   ('UUID_HO_SO_CUA_NGUOI_CHOI', 'ability', 'last-night-verdict', 'Admin gift')
-- on conflict (player_id, reward_type, reward_id) do nothing;

-- ================================================================
-- 6) XEM QUÀ ĐÃ TRAO CHO MỘT ID
-- ================================================================
-- select reward_type, reward_id, note, granted_at
-- from public.player_reward_unlocks
-- where player_id = 'UUID_HO_SO_CUA_NGUOI_CHOI'
-- order by granted_at;

-- ================================================================
-- 7) THU HỒI MỘT PHẦN THƯỞNG
-- ================================================================
-- delete from public.player_reward_unlocks
-- where player_id = 'UUID_HO_SO_CUA_NGUOI_CHOI'
--   and reward_type = 'skin'
--   and reward_id = 'supreme-champion';
