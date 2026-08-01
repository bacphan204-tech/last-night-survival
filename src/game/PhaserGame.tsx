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

export default function PhaserGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

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
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: false,
      },
    }

    const game = new Phaser.Game(config)
    gameRef.current = game

    const handleReturnToMainMenu = () => {
      setHasStarted(false)
    }

    game.events.on(
      RETURN_TO_MAIN_MENU_EVENT,
      handleReturnToMainMenu,
    )

    const resizeObserver = new ResizeObserver(() => {
      game.scale.refresh()
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
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
