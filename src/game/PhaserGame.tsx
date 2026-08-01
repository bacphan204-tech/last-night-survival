import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import GameStartScreen from './GameStartScreen'
import type { StartingProtocolId } from './data/startingProtocols'
import type { PlayerSkinId } from './data/playerSkins'
import type { ActiveAbilityId } from './data/activeAbilities'
import { setRuntimeStartingProtocolId } from './systems/StartingProtocolSystem'
import { setRuntimePlayerSkinId } from './systems/PlayerSkinSystem'
import { setRuntimeActiveAbilityId } from './systems/ActiveAbilityShopSystem'
import { RETURN_TO_MAIN_MENU_EVENT } from './events/gameEvents'
import { MainScene } from './scenes/MainScene'
import { UpgradeScene } from './scenes/UpgradeScene'

type UnlockableScreenOrientation = ScreenOrientation & {
  unlock?: () => void
}

function leaveMobileGameMode() {
  try {
    const orientation = window.screen
      .orientation as UnlockableScreenOrientation | undefined
    orientation?.unlock?.()
  } catch {
    // Một số trình duyệt không hỗ trợ mở khóa hướng màn hình.
  }

  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined)
  }
}

export default function PhaserGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle(
      'game-is-running',
      hasStarted,
    )

    return () => {
      document.documentElement.classList.remove('game-is-running')
    }
  }, [hasStarted])

  useEffect(() => {
    const container = gameContainerRef.current

    if (!hasStarted || !container || gameRef.current) {
      return
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      width: 960,
      height: 540,
      backgroundColor: '#070b16',
      input: {
        activePointers: 3,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [MainScene, UpgradeScene],
      scale: {
        mode: Phaser.Scale.EXPAND,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: true,
      },
    }

    const game = new Phaser.Game(config)
    gameRef.current = game

    const refreshScale = () => {
      window.requestAnimationFrame(() => {
        game.scale.refresh()
        game.scale.updateBounds()
      })
    }

    const handleReturnToMainMenu = () => {
      setHasStarted(false)
      leaveMobileGameMode()
    }

    game.events.on(
      RETURN_TO_MAIN_MENU_EVENT,
      handleReturnToMainMenu,
    )

    const resizeObserver = new ResizeObserver(refreshScale)
    resizeObserver.observe(container)

    window.addEventListener('resize', refreshScale)
    window.addEventListener('orientationchange', refreshScale)

    // Fullscreen và xoay ngang thường làm viewport đổi kích thước nhiều lần.
    const firstRefreshId = window.setTimeout(refreshScale, 80)
    const secondRefreshId = window.setTimeout(refreshScale, 320)

    return () => {
      window.clearTimeout(firstRefreshId)
      window.clearTimeout(secondRefreshId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', refreshScale)
      window.removeEventListener('orientationchange', refreshScale)
      game.events.off(
        RETURN_TO_MAIN_MENU_EVENT,
        handleReturnToMainMenu,
      )
      game.destroy(true)
      gameRef.current = null
    }
  }, [hasStarted])

  const handleStart = (
    startingProtocolId: StartingProtocolId,
    playerSkinId: PlayerSkinId,
    activeAbilityId: ActiveAbilityId | null,
  ) => {
    setRuntimeStartingProtocolId(startingProtocolId)
    setRuntimePlayerSkinId(playerSkinId)
    setRuntimeActiveAbilityId(activeAbilityId)
    setHasStarted(true)
  }

  return (
    <div className="game-container">
      {!hasStarted && (
        <GameStartScreen onStart={handleStart} />
      )}

      <div
        ref={gameContainerRef}
        className={`phaser-canvas-host${hasStarted ? ' is-active' : ''}`}
        aria-hidden={!hasStarted}
      />
    </div>
  )
}
