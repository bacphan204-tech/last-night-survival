import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, CSSProperties } from 'react'
import type { PlayerSkinId } from './data/playerSkins'
import type { ActiveAbilityId } from './data/activeAbilities'
import {
  STARTING_PROTOCOL_DEFINITIONS,
  type StartingProtocolId,
} from './data/startingProtocols'
import { LocalLeaderboardSystem } from './systems/LocalLeaderboardSystem'
import { CareerProgressSystem } from './systems/CareerProgressSystem'
import {
  DailyChallengeSystem,
  formatDailyResetTime,
} from './systems/DailyChallengeSystem'
import { OnlineLeaderboardSystem } from './systems/OnlineLeaderboardSystem'
import { StartingProtocolSystem } from './systems/StartingProtocolSystem'
import { PlayerSkinSystem } from './systems/PlayerSkinSystem'
import { ActiveAbilityShopSystem } from './systems/ActiveAbilityShopSystem'
import {
  PlayerProfileSystem,
  type PlayerProfileBootstrapStatus,
} from './systems/PlayerProfileSystem'
import type { OnlineLeaderboardEntry } from './types/game'
import './dailyChallenges.css'
import './skinShop.css'
import './activeAbilities.css'

type ProfileUiStatus = 'loading' | PlayerProfileBootstrapStatus

type GameStartScreenProps = {
  onStart: (
    startingProtocolId: StartingProtocolId,
    playerSkinId: PlayerSkinId,
    activeAbilityId: ActiveAbilityId | null,
  ) => void
}

function formatScore(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatChallengeProgress(
  metric: string,
  progress: number,
  target: number,
) {
  if (metric === 'survivalSeconds') {
    const formatSeconds = (seconds: number) => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${`${remainingSeconds}`.padStart(2, '0')}`
    }

    return `${formatSeconds(progress)} / ${formatSeconds(target)}`
  }

  if (metric === 'score' || metric === 'kills') {
    return `${formatScore(progress)} / ${formatScore(target)}`
  }

  return `${progress} / ${target}`
}

export default function GameStartScreen({ onStart }: GameStartScreenProps) {
  const onlineLeaderboard = useMemo(
    () => new OnlineLeaderboardSystem(),
    [],
  )
  const localLeaderboard = useMemo(
    () => new LocalLeaderboardSystem(),
    [],
  )
  const careerProgress = useMemo(
    () => new CareerProgressSystem(),
    [],
  )
  const dailyChallengeSystem = useMemo(
    () => new DailyChallengeSystem(),
    [],
  )
  const startingProtocolSystem = useMemo(
    () => new StartingProtocolSystem(),
    [],
  )
  const playerSkinSystem = useMemo(
    () => new PlayerSkinSystem(),
    [],
  )
  const activeAbilityShopSystem = useMemo(
    () => new ActiveAbilityShopSystem(),
    [],
  )

  const playerProfileSystem = useMemo(
    () => new PlayerProfileSystem(),
    [],
  )

  const [displayName, setDisplayName] = useState(
    onlineLeaderboard.getDisplayName(),
  )
  const [profileStatus, setProfileStatus] =
    useState<ProfileUiStatus>('loading')
  const [profileNotice, setProfileNotice] = useState(
    'Đang xác minh hồ sơ người chơi...',
  )
  const [profileDeviceId, setProfileDeviceId] = useState('')
  const [nameError, setNameError] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryAcknowledged, setRecoveryAcknowledged] =
    useState(false)
  const [isClaimingProfile, setIsClaimingProfile] = useState(false)
  const [copyNotice, setCopyNotice] = useState('')
  const [isResetPanelOpen, setIsResetPanelOpen] = useState(false)
  const [resetConfirmationName, setResetConfirmationName] = useState('')
  const [isResettingProfile, setIsResettingProfile] = useState(false)
  const [resetError, setResetError] = useState('')
  const [onlineRecords, setOnlineRecords] = useState<
    OnlineLeaderboardEntry[]
  >([])
  const [leaderboardStatus, setLeaderboardStatus] = useState(
    onlineLeaderboard.isConfigured()
      ? 'Đang tải bảng xếp hạng...'
      : 'Bảng xếp hạng online chưa được cấu hình.',
  )
  const [syncNotice, setSyncNotice] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [startingProtocolId, setStartingProtocolId] =
    useState<StartingProtocolId>(
      startingProtocolSystem.getSelectedId(),
    )
  const [dailySnapshot, setDailySnapshot] = useState(() =>
    dailyChallengeSystem.getSnapshot(),
  )
  const [skinSnapshot, setSkinSnapshot] = useState(() =>
    playerSkinSystem.getSnapshot(),
  )
  const [skinNotice, setSkinNotice] = useState('')
  const [abilitySnapshot, setAbilitySnapshot] = useState(() =>
    activeAbilityShopSystem.getSnapshot(),
  )
  const [abilityNotice, setAbilityNotice] = useState('')
  const [activeLoadoutTab, setActiveLoadoutTab] = useState<
    'skins' | 'abilities' | 'missions'
  >('skins')

  const localBestScore = localLeaderboard.getBestScore()
  const localBestRun = localLeaderboard.getRecords()[0] ?? null
  const careerSummary = careerProgress.getSummary()

  useEffect(() => {
    let cancelled = false

    const refreshProgressSnapshots = () => {
      setDailySnapshot(dailyChallengeSystem.getSnapshot())
      setSkinSnapshot(playerSkinSystem.getSnapshot())
      setAbilitySnapshot(activeAbilityShopSystem.getSnapshot())
    }

    const handleProgressHydrated = () => {
      if (!cancelled) {
        refreshProgressSnapshots()
      }
    }

    async function bootstrapPlayerProfile() {
      setProfileStatus('loading')
      const result = await playerProfileSystem.initialize()

      if (cancelled) {
        return
      }

      setProfileStatus(result.status)
      setProfileNotice(result.message)
      setProfileDeviceId(result.deviceId)
      setRecoveryCode(result.recoveryCode)
      setRecoveryAcknowledged(
        playerProfileSystem.isRecoveryCodeAcknowledged(),
      )

      if (result.profile) {
        setDisplayName(result.profile.displayName)
        onlineLeaderboard.setDisplayName(result.profile.displayName)
      }

      refreshProgressSnapshots()
    }

    window.addEventListener(
      'last-night-survival:progress-hydrated',
      handleProgressHydrated,
    )
    void bootstrapPlayerProfile()

    return () => {
      cancelled = true
      window.removeEventListener(
        'last-night-survival:progress-hydrated',
        handleProgressHydrated,
      )
    }
  }, [
    activeAbilityShopSystem,
    dailyChallengeSystem,
    onlineLeaderboard,
    playerProfileSystem,
    playerSkinSystem,
  ])

  useEffect(() => {
    let cancelled = false

    async function refreshOnlineData(showReconnectMessage = false) {
      if (!onlineLeaderboard.isConfigured()) {
        return
      }

      const pendingBefore = onlineLeaderboard.getPendingRunCount()

      if (pendingBefore > 0) {
        setSyncNotice(
          `${pendingBefore} lượt chơi đang chờ đồng bộ online.`,
        )
      } else if (showReconnectMessage) {
        setSyncNotice('Đã có kết nối mạng. Đang kiểm tra bảng điểm...')
      }

      setLeaderboardStatus('Đang kết nối bảng xếp hạng...')

      const user = await onlineLeaderboard.initialize()

      if (cancelled) {
        return
      }

      if (!user) {
        setLeaderboardStatus(
          onlineLeaderboard.getLastErrorMessage() ||
            'Không thể kết nối bảng xếp hạng online.',
        )
        return
      }

      const syncResult = await onlineLeaderboard.flushPendingRuns()

      if (cancelled) {
        return
      }

      if (syncResult.rejected > 0) {
        const remainingText =
          syncResult.remaining > 0
            ? ` Còn ${syncResult.remaining} lượt đang chờ.`
            : ''
        const syncedText =
          syncResult.synced > 0
            ? ` Đã gửi thành công ${syncResult.synced} lượt.`
            : ''

        setSyncNotice(
          `Đã loại ${syncResult.rejected} lượt không hợp lệ.${syncedText}${remainingText}`,
        )
      } else if (syncResult.synced > 0 && syncResult.remaining === 0) {
        setSyncNotice(
          `Đã gửi thành công ${syncResult.synced} lượt chơi đang chờ.`,
        )
      } else if (syncResult.synced > 0) {
        setSyncNotice(
          `Đã gửi ${syncResult.synced} lượt; còn ${syncResult.remaining} lượt đang chờ.`,
        )
      } else if (syncResult.remaining > 0) {
        setSyncNotice(
          `Còn ${syncResult.remaining} lượt chơi đang chờ mạng ổn định.`,
        )
      } else {
        setSyncNotice('')
      }

      const records = await onlineLeaderboard.getTopRecords(10)

      if (cancelled) {
        return
      }

      setOnlineRecords(records)
      setLeaderboardStatus(
        records.length > 0
          ? ''
          : 'Chưa có điểm nào trên bảng xếp hạng.',
      )
    }

    const handleOnline = () => {
      if (!cancelled) {
        void refreshOnlineData(true)
      }
    }

    void refreshOnlineData()
    window.addEventListener('online', handleOnline)

    return () => {
      cancelled = true
      window.removeEventListener('online', handleOnline)
    }
  }, [onlineLeaderboard])

  useEffect(() => {
    const refreshDailySnapshot = () => {
      setDailySnapshot(dailyChallengeSystem.getSnapshot())
      setSkinSnapshot(playerSkinSystem.getSnapshot())
      setAbilitySnapshot(activeAbilityShopSystem.getSnapshot())
    }

    refreshDailySnapshot()
    const intervalId = window.setInterval(refreshDailySnapshot, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeAbilityShopSystem, dailyChallengeSystem, playerSkinSystem])

  const isProfileLocked =
    profileStatus === 'ready' ||
    profileStatus === 'ready-offline' ||
    profileStatus === 'orphaned'

  const canStartGame =
    (profileStatus === 'ready' || profileStatus === 'ready-offline') &&
    (!recoveryCode || recoveryAcknowledged)

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isProfileLocked) {
      return
    }

    setDisplayName(event.target.value)
    setNameError('')
  }

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void handleStart()
    }
  }

  const handleProtocolSelect = (id: StartingProtocolId) => {
    const savedId = startingProtocolSystem.setSelectedId(id)
    setStartingProtocolId(savedId)
  }

  const handleSkinSelect = (id: PlayerSkinId) => {
    const result = playerSkinSystem.unlockAndSelect(id)
    setSkinSnapshot(result.snapshot)
    setDailySnapshot(dailyChallengeSystem.getSnapshot())

    if (result.reason === 'test-selected') {
      setSkinNotice(`Đã trang bị ${result.definition.name} trong chế độ thử nghiệm.`)
      return
    }

    if (result.reason === 'unlocked') {
      setSkinNotice(
        `Đã mở khóa và trang bị ${result.definition.name} (-${result.spent} Mảnh Đêm).`,
      )
      return
    }

    if (result.reason === 'selected') {
      setSkinNotice(`Đã trang bị ${result.definition.name}.`)
      return
    }

    if (result.reason === 'insufficient') {
      setSkinNotice(
        `Chưa đủ Mảnh Đêm. Cần thêm ${result.missing}.`,
      )
      return
    }

    setSkinNotice('Không thể chọn skin này.')
  }

  const handleAbilitySelect = (id: ActiveAbilityId) => {
    const result = activeAbilityShopSystem.unlockAndSelect(id)
    setAbilitySnapshot(result.snapshot)
    setSkinSnapshot(playerSkinSystem.getSnapshot())
    setDailySnapshot(dailyChallengeSystem.getSnapshot())

    if (!result.definition) {
      setAbilityNotice('Không thể chọn kỹ năng này.')
      return
    }

    if (result.reason === 'test-selected') {
      setAbilityNotice(
        `Đã trang bị ${result.definition.name} trong chế độ thử nghiệm.`,
      )
      return
    }

    if (result.reason === 'unlocked') {
      setAbilityNotice(
        `Đã mở khóa và trang bị ${result.definition.name} (-${formatScore(result.spent)} Mảnh Đêm).`,
      )
      return
    }

    if (result.reason === 'selected') {
      setAbilityNotice(`Đã trang bị ${result.definition.name}.`)
      return
    }

    if (result.reason === 'insufficient') {
      setAbilityNotice(
        `Chưa đủ Mảnh Đêm. Cần thêm ${formatScore(result.missing)}.`,
      )
      return
    }

    setAbilityNotice('Không thể chọn kỹ năng này.')
  }

  const handleCopyRecoveryCode = async () => {
    if (!recoveryCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(recoveryCode)
      setCopyNotice('Đã sao chép mã khôi phục.')
    } catch {
      setCopyNotice('Không thể tự sao chép. Hãy bôi đen và lưu mã thủ công.')
    }
  }

  const handleAcknowledgeRecoveryCode = () => {
    playerProfileSystem.acknowledgeRecoveryCode()
    setRecoveryAcknowledged(true)
    setNameError('')
  }

  const handleOpenResetPanel = () => {
    setResetConfirmationName('')
    setResetError('')
    setIsResetPanelOpen(true)
  }

  const handleCloseResetPanel = () => {
    if (isResettingProfile) {
      return
    }

    setIsResetPanelOpen(false)
    setResetConfirmationName('')
    setResetError('')
  }

  const handleResetProfile = async () => {
    if (isResettingProfile) {
      return
    }

    if (resetConfirmationName.trim() !== displayName) {
      setResetError('Hãy nhập chính xác tên người chơi hiện tại để xác nhận.')
      return
    }

    setIsResettingProfile(true)
    setResetError('')

    const result = await playerProfileSystem.resetProfileAndProgress()

    if (result.status === 'deleted' || result.status === 'unclaimed') {
      window.location.reload()
      return
    }

    setIsResettingProfile(false)
    setResetError(result.message)
  }

  const handleStart = async () => {
    if (isStarting || isClaimingProfile) {
      return
    }

    setNameError('')

    if (profileStatus === 'loading') {
      setNameError('Hệ thống vẫn đang xác minh hồ sơ.')
      return
    }

    if (profileStatus === 'orphaned') {
      setNameError(
        'Hồ sơ cũ cần được admin chuyển sang mã thiết bị mới trước khi chơi.',
      )
      return
    }

    if (profileStatus === 'error') {
      setNameError(
        'Không thể tạo hồ sơ. Hãy kiểm tra kết nối và chạy SQL Step 33.',
      )
      return
    }

    if (profileStatus === 'unclaimed') {
      setIsClaimingProfile(true)
      const result = await playerProfileSystem.claimProfile(displayName)
      setIsClaimingProfile(false)
      setProfileDeviceId(result.deviceId)
      setProfileNotice(result.message)

      if (result.status === 'name-taken') {
        setNameError(
          `${result.message} Liên hệ admin và gửi mã thiết bị bên dưới để khôi phục.`,
        )
        return
      }

      if (
        result.status === 'invalid-name' ||
        result.status === 'offline' ||
        result.status === 'error'
      ) {
        setNameError(result.message)
        return
      }

      if (result.profile) {
        setDisplayName(result.profile.displayName)
        onlineLeaderboard.setDisplayName(result.profile.displayName)
      }

      setProfileStatus('ready')
      setRecoveryCode(result.recoveryCode)
      setRecoveryAcknowledged(
        playerProfileSystem.isRecoveryCodeAcknowledged(),
      )

      if (result.recoveryCode) {
        setNameError(
          'Hồ sơ đã tạo. Hãy sao chép và xác nhận đã lưu mã khôi phục trước khi bắt đầu.',
        )
      }

      return
    }

    if (recoveryCode && !recoveryAcknowledged) {
      setNameError('Bạn cần xác nhận đã lưu mã khôi phục trước khi chơi.')
      return
    }

    if (!canStartGame) {
      setNameError('Hồ sơ chưa sẵn sàng để bắt đầu.')
      return
    }

    const lockedName = playerProfileSystem.getCurrentProfile()?.displayName
    const savedName = onlineLeaderboard.setDisplayName(
      lockedName ?? displayName,
    )
    setDisplayName(savedName)
    const savedProtocolId = startingProtocolSystem.setSelectedId(
      startingProtocolId,
    )
    const savedSkinId = playerSkinSystem.setSelectedId(
      skinSnapshot.selectedId,
    )
    const savedAbilityId = activeAbilityShopSystem.setSelectedId(
      abilitySnapshot.selectedId,
    )
    await playerProfileSystem.syncProgressNow()
    setIsStarting(true)
    onStart(savedProtocolId, savedSkinId, savedAbilityId)
  }

  const selectedProtocol =
    STARTING_PROTOCOL_DEFINITIONS.find(
      (protocol) => protocol.id === startingProtocolId,
    ) ?? STARTING_PROTOCOL_DEFINITIONS[0]!
  const selectedSkin =
    skinSnapshot.skins.find((skin) => skin.selected)?.definition ??
    skinSnapshot.skins[0]?.definition
  const selectedAbility = abilitySnapshot.abilities.find(
    (ability) => ability.selected,
  )?.definition

  return (
    <div className="game-start-screen">
      <div className="start-atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <main className="start-menu-main">
        <header className="start-hero">
          <div className="start-hero-copy">
            <p className="start-kicker">LAST NIGHT SURVIVAL</p>
            <h2>ĐÊM CUỐI CÙNG</h2>
            <p className="start-description">
              Chuẩn bị chiến giáp, chọn kỹ năng và sống sót qua đêm không có
              bình minh.
            </p>
          </div>

          <div className="start-resource-cluster" aria-label="Tài nguyên người chơi">
            <div>
              <span>MẢNH ĐÊM</span>
              <strong>{formatScore(dailySnapshot.totalNightMarks)}</strong>
            </div>
            <div>
              <span>THÀNH TỰU</span>
              <strong>
                {careerSummary.unlockedCount}/{careerSummary.totalAchievements}
              </strong>
            </div>
          </div>
        </header>

        <section className="start-control-panel">
          <div className="start-control-topline">
            <label className="player-name-field">
              <span>TÊN NGƯỜI CHƠI</span>
              <input
                value={displayName}
                onChange={handleNameChange}
                onKeyDown={handleNameKeyDown}
                maxLength={24}
                autoComplete="nickname"
                spellCheck={false}
                aria-label="Tên người chơi"
                disabled={isProfileLocked || profileStatus === 'loading'}
                readOnly={isProfileLocked}
              />
              <small>
                {isProfileLocked
                  ? 'Tên đã khóa vĩnh viễn theo hồ sơ của trình duyệt này.'
                  : '3–24 ký tự, dùng chữ không dấu, số, gạch ngang hoặc gạch dưới.'}
              </small>
            </label>

            <button
              className="start-game-button"
              type="button"
              onClick={handleStart}
              disabled={
                isStarting ||
                isClaimingProfile ||
                profileStatus === 'loading' ||
                profileStatus === 'orphaned' ||
                profileStatus === 'error' ||
                (Boolean(recoveryCode) && !recoveryAcknowledged)
              }
            >
              <span>
                {isStarting
                  ? 'ĐANG KHỞI ĐỘNG'
                  : isClaimingProfile
                    ? 'ĐANG TẠO HỒ SƠ'
                    : profileStatus === 'unclaimed'
                      ? 'TẠO HỒ SƠ DUY NHẤT'
                      : profileStatus === 'orphaned'
                        ? 'CẦN KHÔI PHỤC HỒ SƠ'
                        : 'BẮT ĐẦU SINH TỒN'}
              </span>
              <small>
                {isStarting
                  ? 'Đang tạo chiến trường...'
                  : profileStatus === 'unclaimed'
                    ? 'KIỂM TRA TÊN TRÊN SUPABASE'
                    : 'ENTER / CLICK'}
              </small>
            </button>
          </div>

          <section
            className={`player-profile-card status-${profileStatus}`}
            aria-label="Trạng thái hồ sơ người chơi"
          >
            <div>
              <span>HỒ SƠ ĐÁM MÂY</span>
              <strong>
                {profileStatus === 'loading'
                  ? 'ĐANG XÁC MINH'
                  : profileStatus === 'unclaimed'
                    ? 'CHƯA TẠO HỒ SƠ'
                    : profileStatus === 'orphaned'
                      ? 'CẦN ADMIN KHÔI PHỤC'
                      : profileStatus === 'error'
                        ? 'CHƯA KẾT NỐI'
                        : 'ĐÃ KHÓA TÊN & ĐỒNG BỘ'}
              </strong>
              <small>{profileNotice}</small>
            </div>

            {profileDeviceId &&
              (profileStatus === 'orphaned' || nameError.includes('đã tồn tại')) && (
                <div className="player-device-id">
                  <span>MÃ THIẾT BỊ MỚI GỬI ADMIN</span>
                  <code>{profileDeviceId}</code>
                </div>
              )}

            {(profileStatus === 'ready' ||
              profileStatus === 'ready-offline') && (
              <div className="player-profile-actions">
                <button
                  className="player-profile-reset-button"
                  type="button"
                  onClick={handleOpenResetPanel}
                  disabled={isResettingProfile}
                >
                  ĐẶT LẠI HỒ SƠ
                </button>
                <small>Xóa tên và toàn bộ tiến trình để bắt đầu lại.</small>
              </div>
            )}
          </section>

          {isResetPanelOpen && (
            <section
              className="profile-reset-card"
              aria-label="Xác nhận đặt lại hồ sơ"
            >
              <div className="profile-reset-warning" aria-hidden="true">
                !
              </div>
              <div className="profile-reset-copy">
                <span>VÙNG NGUY HIỂM</span>
                <strong>XÓA VĨNH VIỄN HỒ SƠ?</strong>
                <p>
                  Hành động này sẽ xóa tên <b>{displayName}</b>, hồ sơ đám mây,
                  Mảnh Đêm, skin, kỹ năng, thành tựu, nhiệm vụ, bảng điểm cá
                  nhân và các lượt chơi online của tài khoản này. Không thể
                  hoàn tác.
                </p>
                <label>
                  <small>Nhập chính xác tên hiện tại để xác nhận</small>
                  <input
                    value={resetConfirmationName}
                    onChange={(event) => {
                      setResetConfirmationName(event.target.value)
                      setResetError('')
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleResetProfile()
                      }
                    }}
                    placeholder={displayName}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isResettingProfile}
                  />
                </label>
                {resetError && <em>{resetError}</em>}
              </div>
              <div className="profile-reset-actions">
                <button
                  type="button"
                  onClick={handleCloseResetPanel}
                  disabled={isResettingProfile}
                >
                  HỦY
                </button>
                <button
                  type="button"
                  onClick={() => void handleResetProfile()}
                  disabled={
                    isResettingProfile ||
                    resetConfirmationName.trim() !== displayName
                  }
                >
                  {isResettingProfile ? 'ĐANG XÓA...' : 'XÓA VĨNH VIỄN'}
                </button>
              </div>
            </section>
          )}

          {nameError && <p className="player-profile-error">{nameError}</p>}

          {recoveryCode && !recoveryAcknowledged && (
            <section className="recovery-code-card" aria-label="Mã khôi phục">
              <div>
                <span>MÃ KHÔI PHỤC MỘT LẦN</span>
                <strong>{recoveryCode}</strong>
                <small>
                  Chụp màn hình hoặc lưu mã này. Khi đổi trình duyệt, gửi tên cũ,
                  mã khôi phục và mã thiết bị mới cho admin.
                </small>
                {copyNotice && <em>{copyNotice}</em>}
              </div>
              <div className="recovery-code-actions">
                <button type="button" onClick={() => void handleCopyRecoveryCode()}>
                  SAO CHÉP MÃ
                </button>
                <button type="button" onClick={handleAcknowledgeRecoveryCode}>
                  TÔI ĐÃ LƯU MÃ
                </button>
              </div>
            </section>
          )}

          <section
            className="starting-protocol-section"
            aria-label="Chọn giao thức khởi đầu"
          >
            <div className="starting-protocol-heading">
              <span>GIAO THỨC KHỞI ĐẦU</span>
              <small>Chọn vai trò nền tảng cho lượt chơi.</small>
            </div>

            <div className="starting-protocol-grid">
              {STARTING_PROTOCOL_DEFINITIONS.map((protocol) => {
                const isSelected = protocol.id === startingProtocolId

                return (
                  <button
                    key={protocol.id}
                    className={`starting-protocol-card${
                      isSelected ? ' is-selected' : ''
                    }`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleProtocolSelect(protocol.id)}
                  >
                    <span>{protocol.shortTitle}</span>
                    <strong>{protocol.title}</strong>
                    <small>{protocol.advantages}</small>
                    <em>{protocol.drawback}</em>
                  </button>
                )
              })}
            </div>
          </section>

          <div className="selected-loadout-strip" aria-label="Trang bị đã chọn">
            <div>
              <span>GIAO THỨC</span>
              <strong>{selectedProtocol.shortTitle}</strong>
            </div>
            <div>
              <span>CHIẾN GIÁP</span>
              <strong>{selectedSkin?.name ?? 'Kẻ Sống Sót'}</strong>
            </div>
            <div>
              <span>KỸ NĂNG Q</span>
              <strong>{selectedAbility?.name ?? 'Chưa trang bị'}</strong>
            </div>
          </div>
        </section>

        <nav className="loadout-tabs" aria-label="Danh mục chuẩn bị">
          <button
            type="button"
            className={activeLoadoutTab === 'skins' ? 'is-active' : ''}
            onClick={() => setActiveLoadoutTab('skins')}
          >
            <span>CHIẾN GIÁP</span>
            <small>10 skin</small>
          </button>
          <button
            type="button"
            className={activeLoadoutTab === 'abilities' ? 'is-active' : ''}
            onClick={() => setActiveLoadoutTab('abilities')}
          >
            <span>KỸ NĂNG</span>
            <small>10 kỹ năng</small>
          </button>
          <button
            type="button"
            className={activeLoadoutTab === 'missions' ? 'is-active' : ''}
            onClick={() => setActiveLoadoutTab('missions')}
          >
            <span>NHIỆM VỤ</span>
            <small>{dailySnapshot.completedCount}/{dailySnapshot.totalCount} hôm nay</small>
          </button>
        </nav>

        <div className="loadout-tab-stage">
          {activeLoadoutTab === 'skins' && (
            <section className="skin-shop-section" aria-label="Kho skin">
              <div className="skin-shop-heading">
                <div>
                  <span>KHO CHIẾN GIÁP</span>
                  <strong>CHỌN DIỆN MẠO CHIẾN BINH</strong>
                  <small>
                    Skin càng hiếm càng tăng nhiều chỉ số. Từ 5.000 Mảnh Đêm có
                    đạn và hào quang riêng.
                  </small>
                </div>
                <div className="skin-shop-balance">
                  <span>MẢNH ĐÊM</span>
                  <strong>{formatScore(skinSnapshot.totalNightMarks)}</strong>
                </div>
              </div>

              {skinSnapshot.testMode && (
                <div className="skin-test-mode-banner">
                  TEST MODE • ĐÃ MỞ TOÀN BỘ 10 SKIN • KHÔNG TRỪ MẢNH ĐÊM
                </div>
              )}

              <div className="skin-shop-grid">
                {skinSnapshot.skins.map((skin) => {
                  const { definition } = skin
                  const bonusPercent = Math.round(definition.statBonus * 100)

                  return (
                    <button
                      key={definition.id}
                      className={`skin-card tier-${definition.effectTier}${
                        skin.selected ? ' is-selected' : ''
                      }${skin.unlocked ? '' : ' is-locked'}${
                        skin.canAfford ? ' can-afford' : ''
                      }`}
                      type="button"
                      aria-pressed={skin.selected}
                      onClick={() => handleSkinSelect(definition.id)}
                      style={{
                        '--skin-primary': definition.previewPrimary,
                        '--skin-secondary': definition.previewSecondary,
                        '--skin-accent': definition.previewAccent,
                        '--skin-glow': definition.previewGlow,
                      } as CSSProperties}
                    >
                      <span className="skin-card-preview">
                        <span className="skin-avatar-mini" aria-hidden="true">
                          <span className="skin-avatar-aura" />
                          <span className="skin-avatar-head" />
                          <span className="skin-avatar-eyes" />
                          <span className="skin-avatar-body" />
                          <span className="skin-avatar-core" />
                        </span>
                        <span className="skin-card-rarity">{definition.rarity}</span>
                      </span>

                      <span className="skin-card-title-row">
                        <strong>{definition.name}</strong>
                        <b>+{bonusPercent}%</b>
                      </span>
                      <small>{definition.description}</small>
                      <span className="skin-card-passive">{definition.passiveText}</span>
                      <em>
                        {skin.selected
                          ? 'ĐANG DÙNG'
                          : skin.testUnlocked
                            ? `THỬ NGAY • GIÁ ${formatScore(definition.price)}`
                            : skin.unlocked
                              ? 'TRANG BỊ'
                              : `MỞ KHÓA • ${formatScore(definition.price)}`}
                      </em>
                    </button>
                  )
                })}
              </div>

              {skinNotice && <p className="skin-shop-notice">{skinNotice}</p>}
            </section>
          )}

          {activeLoadoutTab === 'abilities' && (
            <section className="ability-shop-section" aria-label="Kho kỹ năng chủ động">
              <div className="ability-shop-heading">
                <div>
                  <span>ĐIỆN THỜ KỸ NĂNG</span>
                  <strong>TRANG BỊ MỘT QUYỀN NĂNG</strong>
                  <small>
                    Dùng bằng click hoặc phím Q trên máy tính; chạm nút kỹ năng
                    trên điện thoại.
                  </small>
                </div>
                <div className="ability-shop-balance">
                  <span>MẢNH ĐÊM</span>
                  <strong>{formatScore(abilitySnapshot.totalNightMarks)}</strong>
                </div>
              </div>

              {abilitySnapshot.testMode && (
                <div className="ability-test-mode-banner">
                  TEST MODE • ĐÃ MỞ TOÀN BỘ 10 KỸ NĂNG • KHÔNG TRỪ MẢNH ĐÊM
                </div>
              )}

              <div className="ability-shop-grid">
                {abilitySnapshot.abilities.map((ability) => {
                  const { definition } = ability

                  return (
                    <button
                      key={definition.id}
                      className={`ability-card${
                        ability.selected ? ' is-selected' : ''
                      }${ability.unlocked ? '' : ' is-locked'}${
                        ability.canAfford ? ' can-afford' : ''
                      }`}
                      type="button"
                      aria-pressed={ability.selected}
                      onClick={() => handleAbilitySelect(definition.id)}
                      style={{
                        '--ability-color': definition.previewColor,
                        '--ability-secondary': definition.previewSecondary,
                      } as CSSProperties}
                    >
                      <span className="ability-card-icon" aria-hidden="true">
                        <i />
                        <b>{definition.icon}</b>
                      </span>

                      <span className="ability-card-copy">
                        <span className="ability-card-title-row">
                          <strong>{definition.name}</strong>
                          <b>{definition.rarity}</b>
                        </span>
                        <small>{definition.description}</small>
                        <span className="ability-card-effect">
                          {definition.effectText}
                        </span>
                        <span className="ability-card-meta">
                          <em>HỒI {definition.cooldownSeconds}s</em>
                          <strong>GIÁ {formatScore(definition.price)}</strong>
                        </span>
                      </span>

                      <span className="ability-card-action">
                        {ability.selected
                          ? 'ĐANG TRANG BỊ'
                          : ability.testUnlocked
                            ? 'THỬ NGAY'
                            : ability.unlocked
                              ? 'TRANG BỊ'
                              : `MỞ KHÓA • ${formatScore(definition.price)}`}
                      </span>
                    </button>
                  )
                })}
              </div>

              {abilityNotice && (
                <p className="ability-shop-notice">{abilityNotice}</p>
              )}
            </section>
          )}

          {activeLoadoutTab === 'missions' && (
            <section className="daily-missions-panel" aria-label="Nhiệm vụ hôm nay">
              <div className="daily-missions-heading">
                <div>
                  <span>NHIỆM VỤ HÔM NAY</span>
                  <strong>
                    {dailySnapshot.completedCount}/{dailySnapshot.totalCount} HOÀN THÀNH
                  </strong>
                </div>
                <div className="night-mark-counter">
                  <span>MẢNH ĐÊM</span>
                  <strong>{formatScore(dailySnapshot.totalNightMarks)}</strong>
                </div>
              </div>

              <div className="daily-mission-list">
                {dailySnapshot.challenges.map((challenge) => {
                  const percentage = Math.min(
                    100,
                    Math.round((challenge.progress / challenge.target) * 100),
                  )

                  return (
                    <div
                      key={challenge.definition.id}
                      className={`daily-mission-row${
                        challenge.completed ? ' is-completed' : ''
                      }`}
                    >
                      <div className="daily-mission-copy">
                        <strong>{challenge.definition.title}</strong>
                        <small>{challenge.definition.description}</small>
                      </div>
                      <div className="daily-mission-progress-copy">
                        <strong>
                          {formatChallengeProgress(
                            challenge.definition.metric,
                            challenge.progress,
                            challenge.target,
                          )}
                        </strong>
                        <small>+{challenge.definition.reward}</small>
                      </div>
                      <div className="daily-mission-track" aria-hidden="true">
                        <span style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="daily-missions-footer">
                <span>
                  Đặt lại sau{' '}
                  {formatDailyResetTime(dailySnapshot.millisecondsUntilReset)}
                </span>
                <strong>
                  Hoàn tất cả 3: +{dailySnapshot.completionBonus} Mảnh Đêm
                  {dailySnapshot.completionBonusGranted ? ' ✓' : ''}
                </strong>
              </div>
            </section>
          )}
        </div>
      </main>

      <aside className="start-leaderboard" aria-label="Bảng xếp hạng online">
        <section className="leaderboard-card">
          <div className="start-leaderboard-heading">
            <div>
              <p>BẢNG XẾP HẠNG</p>
              <h3>TOP 10 ONLINE</h3>
            </div>
            <span className={onlineLeaderboard.isConfigured() ? 'is-online' : ''}>
              {onlineLeaderboard.isConfigured() ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {syncNotice && <p className="leaderboard-status">{syncNotice}</p>}

          {leaderboardStatus ? (
            <p className="leaderboard-status">{leaderboardStatus}</p>
          ) : (
            <ol className="leaderboard-list">
              {onlineRecords.map((entry, index) => (
                <li key={entry.runId}>
                  <span className="leaderboard-rank">#{index + 1}</span>
                  <span className="leaderboard-player">
                    <strong>{entry.displayName}</strong>
                    <small>
                      Đợt {entry.wave} • {entry.kills} hạ gục
                    </small>
                  </span>
                  <strong className="leaderboard-score">
                    {formatScore(entry.score)}
                  </strong>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="career-command-card">
          <div className="career-command-heading">
            <span>HỒ SƠ SINH TỒN</span>
            <strong>THÀNH TÍCH CỦA BẠN</strong>
          </div>

          <div className="start-summary-grid">
            <div>
              <span>KỶ LỤC</span>
              <strong>{formatScore(localBestScore)}</strong>
            </div>
            <div>
              <span>ĐỢT CAO NHẤT</span>
              <strong>{localBestRun?.wave ?? 0}</strong>
            </div>
            <div>
              <span>THÀNH TỰU</span>
              <strong>
                {careerSummary.unlockedCount}/{careerSummary.totalAchievements}
              </strong>
            </div>
            <div>
              <span>TỔNG HẠ GỤC</span>
              <strong>{formatScore(careerSummary.totalKills)}</strong>
            </div>
          </div>

          {careerSummary.lastUnlocked.length > 0 && (
            <p className="career-recent-unlocks">
              <strong>MỚI MỞ:</strong>{' '}
              {careerSummary.lastUnlocked
                .map((achievement) => achievement.title)
                .join(' • ')}
            </p>
          )}
        </section>

        <div className="start-tip">
          <strong>MẸO:</strong> Kết thúc một lượt để lưu tiến trình, nhận Mảnh
          Đêm và cập nhật nhiệm vụ ngày.
        </div>
      </aside>
    </div>
  )
}
