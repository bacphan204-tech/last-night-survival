# Phần thưởng độc quyền V1

## Nội dung đã thêm

### Ba skin độc quyền

| ID | Tên | Chỉ số | Hào quang |
|---|---|---:|---|
| `supreme-champion` | Vương Giả Tối Thượng | +15% nhóm chỉ số chính | Tím–vàng hoàng kim, đại rune và vương miện |
| `void-conqueror` | Chinh Phục Hư Không | +15% nhóm chỉ số chính | Xanh–tím hư không, cánh năng lượng và lõi chân không |
| `last-night-overlord` | Bá Chủ Đêm Cuối | +15% nhóm chỉ số chính | Đỏ–cam huyết hỏa, tro lửa và vương miện bạo chúa |

### Ba kỹ năng độc quyền

| ID | Tên | Danh hiệu trên đầu |
|---|---|---|
| `supreme-starfall` | Thiên Vẫn Tối Thượng | `TOP 1 TỐI THƯỢNG` |
| `void-dominion` | Vương Quyền Hư Không | `TOP 1 HƯ KHÔNG` |
| `last-night-verdict` | Phán Quyết Đêm Cuối | `TOP 1 ĐÊM CUỐI` |

Khi trang bị một kỹ năng độc quyền, vòng icon nhỏ trên đầu nhân vật được thay bằng dòng danh hiệu và trạng thái hồi chiêu.

## Cài đặt

1. Chép toàn bộ mã nguồn đã sửa vào dự án.
2. Chạy `supabase-exclusive-rewards-v1.sql` một lần trong Supabase SQL Editor.
3. Build và deploy.
4. Tìm `player_profiles.id` của người nhận.
5. Dùng các câu lệnh mẫu cuối file SQL để trao hoặc thu hồi quà.

## Quy tắc khóa

- Sáu vật phẩm luôn hiện trong menu nhưng khóa mặc định.
- Không mua được bằng Mảnh Đêm.
- Không được mở bằng sửa localStorage thông thường.
- Client chỉ nhận quyền qua RPC `get_my_reward_unlocks_v1()` của chính tài khoản anonymous hiện tại.
- Menu tự đồng bộ khi mở, khi có mạng lại và mỗi 60 giây.
