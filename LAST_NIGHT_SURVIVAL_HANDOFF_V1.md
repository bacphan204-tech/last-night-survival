# LAST NIGHT SURVIVAL — TÀI LIỆU BÀN GIAO KỸ THUẬT

> Mục đích: dùng tài liệu này để tiếp tục sửa game trong một cuộc trò chuyện ChatGPT khác nếu mất lịch sử hiện tại.
>
> Repository: `https://github.com/bacphan204-tech/last-night-survival`
>
> Công nghệ: Vite + React + TypeScript + Phaser 4.2.1 + Supabase + Vercel.

---

## 1. Nguyên tắc làm việc đã thống nhất

1. Khi sửa nhiều đoạn trong cùng một file, gửi **toàn bộ file hoàn chỉnh** để chép đè.
2. Không sửa logic chiến đấu khi yêu cầu chỉ là thay giao diện, map, texture hoặc hiệu ứng.
3. Sau mỗi thay đổi phải chạy:

```powershell
npm run build
npm run dev
```

4. Khi build thành công mới đẩy GitHub:

```powershell
git add .
git commit -m "Mo ta thay doi"
git push origin main
```

5. Vercel kết nối nhánh `main`, nên push vào `main` sẽ tự deploy Production.
6. Bản có phím test nên được giữ ở branch/tag riêng:

```text
test-tools
v0.9-test-tools
```

7. Khi nhờ ChatGPT sửa tiếp, nên gửi file mới nhất hoặc nén toàn bộ `src`:

```powershell
Compress-Archive -Path .\src -DestinationPath .\src.zip -Force
```

---

## 2. Cấu trúc tổng thể của ứng dụng

### React bên ngoài game

| File | Trách nhiệm |
|---|---|
| `src/main.tsx` | Điểm khởi động React. |
| `src/App.tsx` | Khung trang tổng thể: header, panel chứa game, ghi chú điều khiển. |
| `src/App.css` | Toàn bộ giao diện trang, menu chính, hồ sơ, reset hồ sơ và responsive. |
| `src/index.css` | CSS gốc/toàn cục. |
| `src/game/PhaserGame.tsx` | Cầu nối React ↔ Phaser; tạo Phaser.Game, chuyển từ menu vào trận, nhận sự kiện quay về menu. |
| `src/game/GameStartScreen.tsx` | Menu chính: hồ sơ, tên, leaderboard, skin, kỹ năng chủ động, nhiệm vụ, giao thức khởi đầu, nút bắt đầu, reset hồ sơ. |

### Phaser trong trận

| File | Trách nhiệm |
|---|---|
| `src/game/scenes/MainScene.ts` | Bộ điều phối chính của toàn bộ trận đấu. Tạo player, quái, wave, kỹ năng, va chạm, HUD, pause, game over, điểm, XP, drop, leaderboard. |
| `src/game/scenes/UpgradeScene.ts` | Màn chọn kỹ năng/nâng cấp/dung hợp khi lên cấp. |
| `src/game/types/game.ts` | Toàn bộ type dùng chung: quái, kỹ năng, projectile, run record, stats... |
| `src/game/config/gameConfig.ts` | Các con số cân bằng lõi: map, player, quái, boss, XP, wave, navigation. |

---

## 3. Map và vật cản

### Trạng thái hiện tại

```text
Kích thước: 5800 × 3400
Seed: last-night-survival-map-v2
```

Map có 4 khu vực và giao lộ trung tâm:

- Tây Bắc: Rừng Chết
- Đông Bắc: Nhà Máy Bỏ Hoang
- Tây Nam: Phế Tích Thành Phố
- Đông Nam: Vùng Lây Nhiễm
- Trung tâm: Trạm Trung Tâm

### Muốn sửa map thì sửa ở đâu?

| Muốn sửa | File chính | Ghi chú |
|---|---|---|
| Tăng/giảm kích thước map | `src/game/config/gameConfig.ts` | Sửa `GAME_CONFIG.world.width/height`. MainScene và Pathfinding đọc từ đây. |
| Đổi màu nền, grid, đường, biome | `src/game/world/WorldBuilder.ts` | `createWorldGround`, `drawBiomePatches`, `drawWorldGrid`, `drawMainRoads`. |
| Thêm/bớt vật cản | `src/game/world/WorldBuilder.ts` | `createWorldObstacles`, landmark, spawn vùng và `createObstacle`. |
| Thêm texture cây/đá/xe/tường/bồn | `src/game/factories/TextureFactory.ts` | Các hàm tạo `obstacle-*`. |
| Sửa collision hoặc vùng chiếm chỗ | `src/game/world/WorldBuilder.ts` | `reserveArea`, `createLandmark`, kích thước collision. |
| Sửa A* hoặc quái bị kẹt | `src/game/systems/PathfindingSystem.ts` | Grid, walkable cells, path, line-of-sight. |
| Sửa tần suất tìm đường/giới hạn hiệu năng | `src/game/config/gameConfig.ts` | Nhóm `navigation`. |
| Sửa xử lý quái mắc kẹt khi chạy | `src/game/scenes/MainScene.ts` | Phần update movement, stuck detection, local avoidance, rescue. |

### Lưu ý khi sửa map

- Không đặt landmark chắn kín đường ngang/dọc trung tâm.
- Sau khi thêm vật cản phải gọi đúng đăng ký vùng collision/pathfinding trong `WorldBuilder`.
- Không tăng map quá lớn một lúc vì A*, camera, số vật thể và bộ nhớ trình duyệt tăng theo.
- Nếu chỉ đổi hình vật cản, không cần sửa `PathfindingSystem` hoặc AI.

---

## 4. Quái thường, tinh anh, mini boss và boss

### 12 loại quái thường/đặc biệt hiện có

| ID | Tên |
|---|---|
| `mutant` | Dị Thể Bóng Tối |
| `crawler` | Kẻ Bò Bóng Đêm |
| `brute` | Dị Thể Lực Sĩ |
| `shooter` | Xạ Thủ Dị Thể |
| `bomber` | Dị Thể Tự Hủy |
| `scatterer` | Pháo Thủ Chùm |
| `healer` | Dị Thể Hồi Sức |
| `shielder` | Dị Thể Hộ Vệ |
| `death-buffer` | Dị Thể Tử Sĩ |
| `brood-mother` | Dị Thể Ổ Mẹ |
| `toxic` | Dị Thể Độc Bệnh |
| `flame` | Dị Thể Hỏa Táng |

Tinh anh gồm: Nhanh Nhẹn, Bọc Giáp, Cuồng Nộ, Hút Máu, Hồi Phục.

### Mini boss

- `mutant-guardian` — Kẻ Canh Giữ Đột Biến
- `plague-warden` — Kẻ Gieo Dịch
- `brood-tyrant` — Bạo Chúa Ổ Mẹ
- `infernal-executioner` — Đao Phủ Hỏa Ngục

### Boss

- `devourer` — The Devourer
- `aegis-colossus` — Aegis Colossus
- `brood-queen` — Brood Queen
- `infernal-engine` — Infernal Engine

### Muốn sửa quái thì sửa ở đâu?

| Muốn sửa | File chính | Ghi chú |
|---|---|---|
| Tên, mốc mở, màu, kích thước, tốc độ, máu, sát thương quái | `src/game/data/enemies.ts` | Nguồn dữ liệu chính cho 12 archetype và elite trait. |
| Hình dáng từng quái | `src/game/factories/TextureFactory.ts` | Texture `enemy-mutant`, `enemy-shooter`, `enemy-bomber`... |
| Gán texture đúng loại quái | `src/game/scenes/MainScene.ts` | `applyEnemyAppearance` và `getEnemyAppearanceTextureKey`. |
| Logic spawn theo wave | `src/game/systems/WaveSystem.ts` | Chọn archetype, elite, danger budget, số quái và thời gian wave. |
| Hệ số chung quái/boss | `src/game/config/gameConfig.ts` | Nhóm `enemy`, `boss`, `wave`. |
| Boss nào xuất hiện và bộ chiêu | `src/game/data/bosses.ts` | `MINI_BOSSES`, `BOSSES`, `abilitiesByPhase`, summon, split. |
| Thực thi kỹ năng boss | `src/game/systems/BossSystem.ts` + `MainScene.ts` | BossSystem chọn trạng thái; MainScene thực hiện shockwave, charge, summon, barrage. |
| Đạn quái và boss | `src/game/systems/EnemyProjectileSystem.ts` | Bắn thẳng, hình quạt, vòng tròn, va chạm và impact. |
| Healer hồi máu | `src/game/systems/SupportEnemySystem.ts` | `tryHeal`, radius, cooldown, số mục tiêu, hiệu ứng. |
| Quái khiên | `src/game/systems/SupportEnemySystem.ts` | `tryShield`, `absorbDamage`, shield duration và visual. |
| Quái chết buff đồng đội | `src/game/systems/EnemyDeathEffectSystem.ts` | `applyDeathBuff`. |
| Ổ mẹ sinh quái con | `src/game/systems/EnemyDeathEffectSystem.ts` + `MainScene.ts` | `scheduleBroodChildren`; MainScene tạo crawler con. |
| Bãi độc/bãi lửa | `src/game/systems/EnemyDeathEffectSystem.ts` | `createPoisonHazardVisual`, `createFireHazardVisual`, damage/radius/duration. |
| Bom tự hủy | `src/game/scenes/MainScene.ts` | Cảnh báo, armed state, detonation, damage. Hình bomber ở TextureFactory. |

### Quy tắc quan trọng

- Sửa **hình quái**: ưu tiên chỉ sửa `TextureFactory.ts`.
- Sửa **chỉ số quái**: sửa `data/enemies.ts` hoặc `gameConfig.ts`.
- Sửa **hành vi**: sửa system tương ứng; không nhồi thêm logic mới vào TextureFactory.

---

## 5. Kỹ năng tự động, nâng cấp và dung hợp

### Sự thật của mã nguồn hiện tại

Game hiện có **8 kỹ năng tự động chiếm slot**, không phải 10:

1. `orbiting-blades` — Lưỡi Dao Quỹ Đạo
2. `chain-lightning` — Sét Dây Chuyền
3. `plasma-nova` — Nova Plasma
4. `ice-lance` — Băng Thương
5. `meteor-rain` — Mưa Thiên Thạch
6. `gravity-well` — Hố Đen Trọng Lực
7. `combat-drone` — Drone Chiến Đấu
8. `energy-laser` — Laser Năng Lượng

Ngoài ra có:

- `multishot` — Đạn Phân Kỳ, không chiếm slot.
- Tối đa 5 kỹ năng tự động cùng lúc.
- Mỗi kỹ năng tối đa cấp 5.
- Có dung hợp khi các kỹ năng đủ điều kiện.

### Muốn sửa kỹ năng tự động thì sửa ở đâu?

| Muốn sửa | File chính | Ghi chú |
|---|---|---|
| Danh sách ID, tên, cấp tối đa, chiếm slot | `src/game/data/skills.ts` | Nguồn dữ liệu lõi. |
| Logic sát thương/cooldown/số lượng/vùng ảnh hưởng | `src/game/systems/SkillSystem.ts` | Mỗi kỹ năng có cụm hàm riêng. |
| Visual lưỡi dao | `SkillSystem.ts` | `ensureOrbitingBladeVisuals`, `updateOrbitingBlades`, hit effect. |
| Visual và logic sét | `SkillSystem.ts` | `updateChainLightning`, `executeChainLightning`, `createLightningSegment`. |
| Nova | `SkillSystem.ts` | `updatePlasmaNova`, `triggerNovaPulse`, `createNovaEffect`. |
| Băng thương | `SkillSystem.ts` | `updateIceLance`, `fireIceLance`, slow, `createIceShatter`. |
| Thiên thạch | `SkillSystem.ts` | `updateMeteorRain`, `scheduleMeteor`, `explodeMeteor`. |
| Hố đen | `SkillSystem.ts` | cast, update wells, collapse, particles. |
| Drone | `SkillSystem.ts` | drone count, visuals, targeting, missile explosion. |
| Laser | `SkillSystem.ts` | `updateEnergyLaser`, `fireEnergyLaser`, line hit, impact. |
| Dung hợp | `SkillSystem.ts` | `fuseRandom`, `upgradeRandomFusion`, tên dung hợp, damage multiplier, aura. |
| Quy tắc lựa chọn nâng cấp | `src/game/systems/UpgradeSystem.ts` | Slot, lựa chọn, chest reward, apply. |
| Nội dung mô tả nâng cấp | `src/game/data/upgrades.ts` | Các passive và thay đổi chỉ số. |
| Card chọn kỹ năng, icon, hover | `src/game/scenes/UpgradeScene.ts` | Giao diện Phaser của màn chọn. |
| Hiển thị kỹ năng trong Pause | `src/game/systems/PauseMenuSystem.ts` | Card skill, cấp, dung hợp và stats. |
| Gọi SkillSystem trong trận | `src/game/scenes/MainScene.ts` | `skillSystem.update`, apply upgrade, open UpgradeScene. |

### Khi thêm kỹ năng tự động mới

Phải sửa đồng bộ ít nhất:

1. `src/game/types/game.ts` — thêm ID vào union type.
2. `src/game/data/skills.ts` — thêm định nghĩa.
3. `src/game/systems/SkillSystem.ts` — runtime state, update, damage, visual, reset.
4. `src/game/systems/UpgradeSystem.ts` — cho xuất hiện đúng quy tắc.
5. `src/game/scenes/UpgradeScene.ts` — icon/mô tả nếu đang map theo ID.
6. `src/game/systems/PauseMenuSystem.ts` — icon/tên nếu đang map riêng.
7. `src/game/systems/AudioSystem.ts` — âm thanh kỹ năng.
8. `MainScene.ts` nếu cần tương tác đặc biệt.

Không chỉ thêm vào `skills.ts`; làm vậy sẽ có ID nhưng không có hành vi thực tế.

---

## 6. 10 kỹ năng chủ động dùng phím Q

Đây là hệ thống riêng, khác kỹ năng tự động:

1. Vương Miện Đạn
2. Ảnh Bộ Xung Kích
3. Từ Trường Hủy Diệt
4. Mạch Sống Tái Sinh
5. Bùng Nổ Plasma
6. Cuồng Nộ Chiến Thần
7. Thành Trì Bất Diệt
8. Bước Nhảy Hư Không
9. Thiên Lôi Phán Quyết
10. Tận Thế Vĩnh Hằng

### File liên quan

| Muốn sửa | File |
|---|---|
| Tên, giá, rarity, cooldown, mô tả | `src/game/data/activeAbilities.ts` |
| Shop/mở khóa/chọn kỹ năng | `src/game/systems/ActiveAbilityShopSystem.ts` |
| Toàn bộ logic và hiệu ứng trong trận | `src/game/systems/ActiveAbilityCombatSystem.ts` |
| Card chọn kỹ năng ngoài menu | `src/game/GameStartScreen.tsx` |
| CSS card/shop | `src/game/activeAbilities.css` |
| Phím Q và kết nối vào MainScene | `src/game/scenes/MainScene.ts` |
| Âm kỹ năng | `src/game/systems/AudioSystem.ts` |

Production hiện đặt:

```ts
ACTIVE_ABILITY_TEST_MODE = false
```

Không được bật `true` trên nhánh `main`, vì sẽ mở miễn phí toàn bộ kỹ năng chủ động.

---

## 7. Nhân vật, 10 skin và aura

### 10 skin hiện tại

- Kẻ Sống Sót
- Hỏa Linh
- Băng Chủ
- Ảnh Sát
- Kẻ Dệt Tơ Đỏ
- Lôi Thần
- Tề Thiên
- Hư Không Vương
- Nhật Thực Đế
- Thiên Tai Tối Thượng

### Muốn sửa ở đâu?

| Muốn sửa | File |
|---|---|
| Tên, giá, rarity, màu, bonus stats | `src/game/data/playerSkins.ts` |
| Mở khóa/chọn skin/lưu localStorage | `src/game/systems/PlayerSkinSystem.ts` |
| Hình nhân vật, aura, rune, particle, projectile skin | `src/game/systems/PlayerSkinVisualSystem.ts` |
| Card shop skin ngoài menu | `src/game/GameStartScreen.tsx` |
| CSS shop skin | `src/game/skinShop.css` |
| Gắn skin runtime khi bắt đầu | `src/game/PhaserGame.tsx` và `MainScene.ts` |

Production hiện đặt:

```ts
PLAYER_SKIN_TEST_MODE = false
```

Aura mờ/đậm, particle và vệt chạy chủ yếu sửa trong:

```text
src/game/systems/PlayerSkinVisualSystem.ts
```

Không cần sửa logic stats nếu chỉ muốn aura đẹp hơn.

---

## 8. Giao diện chọn kỹ năng, Pause, HUD và mobile

| Giao diện | File logic | File CSS/texture |
|---|---|---|
| Menu chính | `GameStartScreen.tsx` | `App.css`, `skinShop.css`, `activeAbilities.css`, `dailyChallenges.css` |
| Card chọn nâng cấp | `UpgradeScene.ts` | Vẽ bằng Phaser trong chính file; icon có thể dùng `TextureFactory.ts`. |
| HUD trong trận | `HudSystem.ts` | Vẽ bằng Phaser. |
| Pause menu | `PauseMenuSystem.ts` | Vẽ bằng Phaser. |
| Nút/joystick mobile | `MobileControlSystem.ts` | Phaser. |
| Canvas responsive | `PhaserGame.tsx` | `App.css`. |
| Header trang ngoài | `App.tsx` | `App.css`. |

### Khi sửa giao diện menu

- Layout/React content: `GameStartScreen.tsx`.
- Màu, spacing, card, responsive: CSS tương ứng.
- Không sửa `MainScene.ts` chỉ để đổi màu menu ngoài game.

### Khi sửa HUD trong trận

- `HudSystem.ts`: thanh máu, XP, wave, boss, dòng hướng dẫn.
- `PauseMenuSystem.ts`: màn ESC và danh sách skill/stats.
- `UpgradeScene.ts`: màn chọn nâng cấp.

---

## 9. Hệ thống âm thanh hiện tại

### File

```text
src/game/systems/AudioSystem.ts
public/audio/v7/*
```

### Audio hiện dùng

- Nhạc nền: `public/audio/v7/night-drive-loop.mp3`
- Shot 1–3
- Damage 1–2
- Enemy kill 1–3
- Boss/mini boss intro
- Boss kill
- Wave start
- Level up
- Game over
- Pickup
- Fusion
- Âm 8 kỹ năng tự động

### Muốn sửa gì ở đâu?

| Muốn sửa | File |
|---|---|
| Đổi file âm | `public/audio/v7` và đường dẫn trong `AudioSystem.ts` |
| Âm lượng/pitch/pan/cooldown chống spam | `AudioSystem.ts` |
| Nhạc nền to/nhỏ | `AudioSystem.ts` → target music volume và `GameSettingsSystem.ts` |
| Cài đặt Music/SFX | `GameSettingsSystem.ts` + `PauseMenuSystem.ts` |
| Gọi âm khi sự kiện xảy ra | `MainScene.ts`, `SkillSystem.ts`, `ActiveAbilityCombatSystem.ts` |

Không dùng lại các thư mục audio cũ nếu `AudioSystem.ts` chỉ gọi `v7`.

---

## 10. Điểm, XP, drop, wave và cân bằng

| Hệ thống | File |
|---|---|
| Điểm hạ quái/wave | `ScoreSystem.ts` |
| Ghi thống kê một lượt | `RunStatsSystem.ts` |
| XP và level | `ExperienceSystem.ts`, `PlayerProgressionSystem.ts` |
| Orb XP | `ExperienceOrbSystem.ts` |
| Pickup hồi máu/bom/nam châm | `data/pickups.ts`, `PickupSystem.ts`, `MainScene.ts` |
| Rương | `data/chests.ts`, `ChestSystem.ts` |
| Wave, số quái, spawn | `WaveSystem.ts`, `gameConfig.ts` |
| Passive upgrades | `data/upgrades.ts`, `UpgradeSystem.ts` |
| Mảnh Đêm | `NightShardRewardSystem.ts`, `DailyChallengeSystem.ts` |
| Thành tựu | `data/achievements.ts`, `CareerProgressSystem.ts` |
| Nhiệm vụ ngày | `data/dailyChallenges.ts`, `DailyChallengeSystem.ts`, `dailyChallenges.css` |
| Giao thức khởi đầu | `data/startingProtocols.ts`, `StartingProtocolSystem.ts` |

---

## 11. Hồ sơ Supabase, lưu tiến trình và reset

### Biến môi trường Vercel/Vite

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Hoặc key cũ:

```text
VITE_SUPABASE_ANON_KEY
```

File đọc biến:

```text
src/lib/supabase.ts
```

Không bao giờ đưa `service_role` hoặc secret key vào biến `VITE_*`.

### SQL hồ sơ đã cài

File đã dùng:

```text
player-profile-supabase-v2.sql
reset-player-profile-v1.sql
```

RPC hiện cần có trên Supabase:

```text
get_my_player_profile_v1()
claim_player_profile_v1(text, jsonb)
sync_player_progress_v1(uuid, jsonb, bigint)
admin_transfer_player_profile_v1(text, text, uuid, text)
reset_my_player_profile_v1()
```

### Client hồ sơ

File chính:

```text
src/game/systems/PlayerProfileSystem.ts
```

Trách nhiệm:

- Đăng nhập Supabase anonymous.
- Đọc hồ sơ hiện tại.
- Tạo tên duy nhất.
- Tạo/lưu mã khôi phục.
- Đóng gói localStorage thành progress JSON.
- Đồng bộ cloud theo debounce.
- Dùng bản local khi offline.
- Reset cloud và local.

### UI hồ sơ/reset

| Phần | File |
|---|---|
| Form tên, trạng thái profile, mã khôi phục | `GameStartScreen.tsx` |
| Nút Đặt lại hồ sơ và xác nhận nhập tên | `GameStartScreen.tsx` |
| CSS reset panel | `App.css` — các class `.player-profile-reset-*`, `.profile-reset-*`. |
| RPC xóa cloud | `reset-player-profile-v1.sql` |
| Xóa localStorage/sessionStorage | `PlayerProfileSystem.ts` → `clearAllLocalProgress`. |

### Reset hiện xóa gì?

- Bản ghi `player_profiles` của anonymous user hiện tại.
- Các lượt online trong `leaderboard_runs` nếu SQL tìm được cột chủ sở hữu hoặc tên.
- Tất cả localStorage/sessionStorage bắt đầu bằng:

```text
last-night-survival:
```

Bao gồm skin, kỹ năng, leaderboard local, nhiệm vụ, thành tựu, mảnh, tên và hồ sơ.

Cài đặt âm thanh/hiển thị dùng key:

```text
last-night-survival-settings-v1
```

Key này không có dấu `:` sau tên game nên reset hiện **giữ lại cài đặt**.

---

## 12. Leaderboard

| Hệ thống | File |
|---|---|
| Local leaderboard | `LocalLeaderboardSystem.ts` |
| Online leaderboard | `OnlineLeaderboardSystem.ts` |
| Hiển thị bảng ngoài menu | `GameStartScreen.tsx` |
| Gửi record khi kết thúc | `MainScene.ts` |
| Tên hiển thị | Đồng bộ giữa `PlayerProfileSystem` và `OnlineLeaderboardSystem`. |

Nếu online lỗi nhưng game vẫn chơi được, kiểm tra:

1. Environment Variables trên Vercel.
2. Supabase table/RPC/RLS.
3. Console Network xem request RPC lỗi gì.
4. `OnlineLeaderboardSystem.getLastErrorMessage()`.

---

## 13. Các chức năng test đã bỏ khỏi Production

Đã bỏ:

- `N`: chuyển wave.
- `L`: tăng level/XP.
- `P`: tạo pickup test.
- `C`: tạo chest test.
- Dòng HUD hướng dẫn phím test.
- Mở miễn phí toàn bộ skin.
- Mở miễn phí toàn bộ active ability.

Các file đã sửa khi dọn Production:

```text
src/game/data/activeAbilities.ts
src/game/data/playerSkins.ts
src/game/scenes/MainScene.ts
src/game/systems/ChestSystem.ts
src/game/systems/ExperienceSystem.ts
src/game/systems/HudSystem.ts
src/game/systems/PickupSystem.ts
```

Giữ lại:

- `Q`: active ability.
- `ESC`: pause.
- `R`: chơi lại khi game over.
- WASD/mũi tên: di chuyển.

### Khi cần test lại

Chuyển sang branch:

```powershell
git switch test-tools
npm install
npm run dev
```

Quay lại Production:

```powershell
git switch main
git pull
```

Không chép file test đè lên `main` rồi quên tắt test mode.

---

## 14. GitHub và Vercel

### Repository

```text
https://github.com/bacphan204-tech/last-night-survival
```

### Các commit quan trọng đã biết

```text
b425166 — Hoàn thiện map, quái, kỹ năng và audio V2; còn phím test.
b9474ba — Loại bỏ chức năng test khỏi bản Production.
```

Sau đó còn commit reset hồ sơ; hash cần xem bằng:

```powershell
git log --oneline --decorate -10
```

### Quy trình an toàn trước khi sửa

```powershell
cd D:\Projects\last-night-survival
git switch main
git pull
git status
```

### Sau khi sửa

```powershell
npm run build
git status
git add .
git commit -m "Mo ta thay doi"
git push origin main
```

### Nếu push hỏi đăng nhập

```powershell
git credential-manager github login
git push origin main
```

### Cảnh báo LF/CRLF

Dòng:

```text
LF will be replaced by CRLF
```

chỉ là cảnh báo xuống dòng Windows, không phải lỗi build hoặc lỗi Git.

---

## 15. Cách yêu cầu ChatGPT trong cuộc trò chuyện mới

Dán nguyên mẫu sau:

```text
Tôi đang tiếp tục dự án Last Night Survival.

Công nghệ:
- Vite + React + TypeScript
- Phaser 4.2.1
- Supabase
- Deploy GitHub/Vercel

Repository:
https://github.com/bacphan204-tech/last-night-survival

Quy tắc làm việc:
- Khi sửa nhiều đoạn trong một file, hãy gửi toàn bộ file hoàn chỉnh.
- Không thay đổi logic nếu tôi chỉ yêu cầu sửa giao diện/texture/effect.
- Phải giữ build TypeScript sạch, không để biến/hàm không dùng.
- Không bật PLAYER_SKIN_TEST_MODE hoặc ACTIVE_ABILITY_TEST_MODE trên Production.
- Không thêm lại các phím test N/L/P/C vào nhánh main.

Kiến trúc quan trọng:
- MainScene.ts: điều phối trận đấu.
- WorldBuilder.ts + gameConfig.ts: map.
- TextureFactory.ts: texture quái/vật cản.
- enemies.ts + bosses.ts: dữ liệu quái/boss.
- SkillSystem.ts + skills.ts: 8 kỹ năng tự động và dung hợp.
- ActiveAbilityCombatSystem.ts + activeAbilities.ts: 10 kỹ năng chủ động Q.
- PlayerSkinVisualSystem.ts + playerSkins.ts: nhân vật, skin, aura.
- UpgradeScene.ts: UI chọn kỹ năng.
- HudSystem.ts/PauseMenuSystem.ts: UI trong trận.
- GameStartScreen.tsx + App.css: menu, hồ sơ, reset.
- PlayerProfileSystem.ts: hồ sơ cloud/local.
- AudioSystem.ts + public/audio/v7: âm thanh.

Hệ thống Supabase cần các RPC:
- get_my_player_profile_v1
- claim_player_profile_v1
- sync_player_progress_v1
- admin_transfer_player_profile_v1
- reset_my_player_profile_v1

Bản Production đã bỏ N/L/P/C và đã tắt test mode skin/active ability.

Đây là yêu cầu mới của tôi:
[VIẾT YÊU CẦU Ở ĐÂY]

Tôi sẽ gửi src.zip hoặc các file mới nhất. Hãy đọc đúng mã nguồn tôi gửi trước khi sửa.
```

---

## 16. Nên gửi file nào tùy loại yêu cầu

### Sửa map/quái

```text
src/game/config/gameConfig.ts
src/game/world/WorldBuilder.ts
src/game/factories/TextureFactory.ts
src/game/data/enemies.ts
src/game/data/bosses.ts
src/game/scenes/MainScene.ts
src/game/systems/PathfindingSystem.ts
src/game/systems/EnemyDeathEffectSystem.ts
src/game/systems/SupportEnemySystem.ts
```

### Sửa kỹ năng/dung hợp

```text
src/game/types/game.ts
src/game/data/skills.ts
src/game/data/upgrades.ts
src/game/systems/SkillSystem.ts
src/game/systems/UpgradeSystem.ts
src/game/scenes/UpgradeScene.ts
src/game/scenes/MainScene.ts
src/game/systems/PauseMenuSystem.ts
src/game/systems/AudioSystem.ts
```

### Sửa 10 active ability

```text
src/game/data/activeAbilities.ts
src/game/systems/ActiveAbilityShopSystem.ts
src/game/systems/ActiveAbilityCombatSystem.ts
src/game/GameStartScreen.tsx
src/game/activeAbilities.css
src/game/scenes/MainScene.ts
```

### Sửa nhân vật/skin/aura

```text
src/game/data/playerSkins.ts
src/game/systems/PlayerSkinSystem.ts
src/game/systems/PlayerSkinVisualSystem.ts
src/game/GameStartScreen.tsx
src/game/skinShop.css
src/game/scenes/MainScene.ts
```

### Sửa hồ sơ/reset/leaderboard

```text
src/lib/supabase.ts
src/game/GameStartScreen.tsx
src/game/systems/PlayerProfileSystem.ts
src/game/systems/OnlineLeaderboardSystem.ts
src/game/systems/LocalLeaderboardSystem.ts
src/App.css
SQL đang dùng trên Supabase
```

### Sửa âm thanh

```text
src/game/systems/AudioSystem.ts
src/game/systems/GameSettingsSystem.ts
src/game/scenes/MainScene.ts
src/game/systems/SkillSystem.ts
src/game/systems/ActiveAbilityCombatSystem.ts
public/audio/v7
```

Nếu không chắc file nào liên quan, gửi toàn bộ `src.zip`.

---

## 17. Checklist sau mỗi lần cập nhật

1. `npm run build` thành công.
2. Không có `TS6133`, `TS2322`, `TS2345` hoặc import thừa.
3. Test menu profile/Supabase ONLINE.
4. Test reset hồ sơ bằng account thử, không dùng hồ sơ chính.
5. Test wave 1, 5, 10, 15, 20, 25, 30, 40.
6. Test 8 auto skills, dung hợp và 10 active abilities.
7. Test FPS lúc đông quái và khi nhiều particle.
8. Test mobile ngang màn hình.
9. Test audio Music/SFX ở Pause.
10. Đảm bảo N/L/P/C không hoạt động trên Production.
11. Đảm bảo skin/ability không bị mở miễn phí.
12. Push GitHub và chờ Vercel Deployment `Ready`.
13. Ctrl+F5 để tránh cache JS/audio cũ.

---

## 18. Những phần còn có thể nâng cấp sau

- Thêm 2 kỹ năng tự động để đủ 10 (hiện thực tế mới có 8).
- Tối ưu code splitting vì bundle Phaser hiện lớn và Vite cảnh báo chunk > 500 kB.
- Cải thiện thêm animation sprite thực, thay vì toàn bộ texture vẽ bằng Phaser Graphics.
- Cân lại audio và combat feedback theo từng skill.
- Tối ưu particle theo chất lượng thiết bị.
- Thêm chế độ đồ họa thấp/trung bình/cao.
- Thêm map/biome mới nhưng giữ giới hạn pathfinding.
- Tăng bảo mật/khôi phục hồ sơ bằng giao diện admin riêng.

