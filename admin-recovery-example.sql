-- Chỉ chạy trong Supabase SQL Editor với quyền admin.
-- Thay các giá trị bên dưới bằng thông tin thật.

select public.admin_transfer_player_profile_v1(
  'TenCu',
  'LNS-ABCD-EF12-3456',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'TenMoi' -- đổi thành null nếu giữ nguyên tên cũ
);
LNS-EBB7-CE30-9A02