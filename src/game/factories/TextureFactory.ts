import Phaser from 'phaser'

type TexturePainter = (graphics: Phaser.GameObjects.Graphics) => void

export function createGameTextures(scene: Phaser.Scene) {
  createObstacleTextures(scene)
  createPlayerTexture(scene)
  createProjectileTexture(scene)
  createExperienceOrbTexture(scene)
  createEnemyTextures(scene)
  createMiniBossTextures(scene)
  createBossTextures(scene)
  createSkillVisualTextures(scene)
  createUpgradeIconTextures(scene)
  createActiveAbilityIconTextures(scene)
}

function generateTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  painter: TexturePainter,
) {
  if (scene.textures.exists(key)) {
    return
  }

  const graphics = scene.add.graphics()
  painter(graphics)
  graphics.generateTexture(key, width, height)
  graphics.destroy()
}

function drawEyes(
  graphics: Phaser.GameObjects.Graphics,
  leftX: number,
  rightX: number,
  y: number,
  radius: number,
  irisColor: number,
  angry = false,
) {
  graphics.fillStyle(0xf8fafc, 1)
  graphics.fillCircle(leftX, y, radius)
  graphics.fillCircle(rightX, y, radius)

  graphics.fillStyle(irisColor, 1)
  graphics.fillCircle(leftX, y, Math.max(2, radius * 0.48))
  graphics.fillCircle(rightX, y, Math.max(2, radius * 0.48))

  graphics.fillStyle(0x020617, 1)
  graphics.fillCircle(leftX, y, Math.max(1, radius * 0.22))
  graphics.fillCircle(rightX, y, Math.max(1, radius * 0.22))

  if (angry) {
    graphics.lineStyle(Math.max(2, radius * 0.45), 0x1f0710, 1)
    graphics.lineBetween(leftX - radius, y - radius - 2, leftX + radius, y - 1)
    graphics.lineBetween(rightX - radius, y - 1, rightX + radius, y - radius - 2)
  }
}

function drawShieldShape(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: number,
  borderColor: number,
) {
  graphics.fillStyle(fillColor, 1)
  graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height * 0.68, 8)
  graphics.fillTriangle(
    x - width / 2,
    y + height * 0.08,
    x + width / 2,
    y + height * 0.08,
    x,
    y + height / 2,
  )
  graphics.lineStyle(3, borderColor, 0.95)
  graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height * 0.68, 8)
  graphics.lineBetween(x - width / 2, y + height * 0.08, x, y + height / 2)
  graphics.lineBetween(x + width / 2, y + height * 0.08, x, y + height / 2)
}

function drawMedicalCross(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
) {
  graphics.fillStyle(color, 1)
  graphics.fillRoundedRect(x - size * 0.18, y - size / 2, size * 0.36, size, 2)
  graphics.fillRoundedRect(x - size / 2, y - size * 0.18, size, size * 0.36, 2)
}

function createObstacleTextures(scene: Phaser.Scene) {
  createTreeTexture(scene)
  createGiantTreeTexture(scene)
  createRockTexture(scene)
  createLargeRockTexture(scene)
  createCrateTexture(scene)
  createTankTexture(scene)
  createWreckTexture(scene)
  createTruckWreckTexture(scene)
  createBarrierTexture(scene)
  createRuinedWallTexture(scene)
}

function createTreeTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-tree', 112, 146, (graphics) => {
    graphics.fillStyle(0x000000, 0.38)
    graphics.fillEllipse(56, 128, 78, 18)

    graphics.fillStyle(0x3f2a1f, 1)
    graphics.fillRoundedRect(47, 61, 19, 67, 7)
    graphics.fillStyle(0x6b4630, 0.8)
    graphics.fillRoundedRect(51, 65, 6, 57, 3)

    graphics.lineStyle(9, 0x3f2a1f, 1)
    graphics.lineBetween(55, 74, 28, 47)
    graphics.lineBetween(59, 68, 84, 39)
    graphics.lineBetween(55, 55, 43, 22)
    graphics.lineBetween(62, 56, 72, 18)

    graphics.fillStyle(0x102b23, 1)
    graphics.fillCircle(31, 42, 27)
    graphics.fillCircle(60, 31, 34)
    graphics.fillCircle(84, 48, 27)
    graphics.fillStyle(0x1f4b3c, 0.92)
    graphics.fillCircle(47, 38, 22)
    graphics.fillCircle(70, 42, 20)
    graphics.fillStyle(0x4d7c5d, 0.35)
    graphics.fillCircle(52, 23, 12)
    graphics.lineStyle(2, 0x86efac, 0.18)
    graphics.strokeCircle(60, 31, 34)
  })
}

function createGiantTreeTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-tree-giant', 220, 270, (graphics) => {
    graphics.fillStyle(0x000000, 0.46)
    graphics.fillEllipse(110, 247, 160, 28)

    graphics.fillStyle(0x2b211c, 1)
    graphics.fillRoundedRect(89, 107, 43, 142, 15)
    graphics.fillStyle(0x574033, 0.9)
    graphics.fillRoundedRect(101, 112, 11, 128, 5)
    graphics.fillStyle(0x1f1713, 0.9)
    graphics.fillRoundedRect(119, 129, 8, 92, 4)

    graphics.lineStyle(17, 0x2b211c, 1)
    graphics.lineBetween(104, 132, 48, 77)
    graphics.lineBetween(118, 119, 169, 57)
    graphics.lineBetween(106, 99, 78, 36)
    graphics.lineBetween(123, 96, 143, 26)

    graphics.fillStyle(0x0c251d, 1)
    graphics.fillCircle(51, 72, 48)
    graphics.fillCircle(105, 49, 58)
    graphics.fillCircle(164, 67, 48)
    graphics.fillCircle(129, 91, 48)
    graphics.fillStyle(0x173f30, 0.92)
    graphics.fillCircle(77, 73, 39)
    graphics.fillCircle(132, 52, 42)
    graphics.fillCircle(153, 86, 34)
    graphics.fillStyle(0x365f49, 0.28)
    graphics.fillCircle(97, 28, 21)
    graphics.fillCircle(166, 58, 18)

    graphics.lineStyle(4, 0x020617, 0.38)
    graphics.lineBetween(82, 120, 68, 186)
    graphics.lineBetween(138, 126, 153, 198)
    graphics.lineStyle(2, 0x86efac, 0.16)
    graphics.strokeCircle(105, 49, 58)
  })
}

function createRockTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-rock', 108, 76, (graphics) => {
    graphics.fillStyle(0x000000, 0.38)
    graphics.fillEllipse(54, 66, 88, 16)
    graphics.fillStyle(0x2f3b49, 1)
    graphics.fillTriangle(8, 60, 28, 18, 55, 64)
    graphics.fillTriangle(34, 63, 63, 10, 101, 63)
    graphics.fillStyle(0x475569, 1)
    graphics.fillTriangle(27, 52, 41, 22, 57, 56)
    graphics.fillTriangle(59, 53, 76, 19, 92, 57)
    graphics.fillStyle(0x64748b, 0.38)
    graphics.fillTriangle(41, 22, 51, 38, 57, 56)
    graphics.lineStyle(2, 0x94a3b8, 0.36)
    graphics.lineBetween(41, 22, 28, 52)
    graphics.lineBetween(76, 19, 60, 53)
  })
}

function createLargeRockTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-rock-large', 210, 132, (graphics) => {
    graphics.fillStyle(0x000000, 0.43)
    graphics.fillEllipse(105, 116, 178, 26)
    graphics.fillStyle(0x252f3a, 1)
    graphics.fillTriangle(12, 105, 51, 35, 92, 112)
    graphics.fillTriangle(62, 110, 114, 17, 154, 113)
    graphics.fillTriangle(121, 112, 169, 41, 200, 108)
    graphics.fillStyle(0x3f4b59, 1)
    graphics.fillTriangle(46, 93, 66, 45, 96, 103)
    graphics.fillTriangle(104, 95, 122, 28, 153, 105)
    graphics.fillTriangle(151, 98, 174, 51, 191, 103)
    graphics.fillStyle(0x64748b, 0.35)
    graphics.fillTriangle(68, 44, 81, 70, 96, 103)
    graphics.fillTriangle(122, 28, 134, 66, 153, 105)
    graphics.lineStyle(3, 0x94a3b8, 0.28)
    graphics.lineBetween(66, 45, 48, 93)
    graphics.lineBetween(122, 28, 105, 95)
    graphics.lineBetween(174, 51, 152, 98)
    graphics.lineStyle(3, 0x111827, 0.7)
    graphics.lineBetween(98, 58, 82, 83)
    graphics.lineBetween(98, 58, 119, 75)
  })
}

function createCrateTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-crate', 76, 76, (graphics) => {
    graphics.fillStyle(0x000000, 0.4)
    graphics.fillEllipse(38, 68, 60, 13)
    graphics.fillStyle(0x78350f, 1)
    graphics.fillRoundedRect(8, 8, 60, 57, 5)
    graphics.fillStyle(0x9a4b12, 1)
    graphics.fillRect(15, 15, 46, 43)
    graphics.lineStyle(6, 0x451a03, 1)
    graphics.strokeRect(9, 9, 58, 55)
    graphics.lineBetween(15, 15, 61, 58)
    graphics.lineBetween(61, 15, 15, 58)
    graphics.lineStyle(2, 0xfbbf24, 0.42)
    graphics.strokeRect(18, 18, 40, 37)
  })
}

function createTankTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-tank', 168, 196, (graphics) => {
    graphics.fillStyle(0x000000, 0.46)
    graphics.fillEllipse(84, 181, 120, 22)
    graphics.fillStyle(0x343a40, 1)
    graphics.fillRoundedRect(39, 31, 90, 145, 24)
    graphics.fillStyle(0x4b5563, 1)
    graphics.fillRoundedRect(48, 39, 72, 128, 19)
    graphics.fillStyle(0x1f2937, 1)
    graphics.fillRoundedRect(55, 49, 58, 17, 7)
    graphics.fillRoundedRect(55, 139, 58, 17, 7)
    graphics.lineStyle(7, 0x111827, 1)
    graphics.lineBetween(42, 87, 126, 87)
    graphics.lineBetween(42, 113, 126, 113)
    graphics.fillStyle(0x9a3412, 0.72)
    graphics.fillCircle(57, 78, 10)
    graphics.fillCircle(110, 127, 13)
    graphics.fillCircle(77, 151, 7)
    graphics.lineStyle(3, 0xfb923c, 0.4)
    graphics.strokeCircle(57, 78, 10)
    graphics.fillStyle(0xfacc15, 0.85)
    graphics.fillTriangle(78, 94, 91, 94, 84, 108)
    graphics.fillRect(81, 110, 7, 12)
  })
}

function createWreckTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-wreck', 164, 98, (graphics) => {
    graphics.fillStyle(0x000000, 0.46)
    graphics.fillEllipse(82, 83, 145, 22)
    graphics.fillStyle(0x343a46, 1)
    graphics.fillRoundedRect(14, 42, 136, 39, 13)
    graphics.fillStyle(0x4b5563, 1)
    graphics.fillRoundedRect(41, 20, 75, 37, 14)
    graphics.fillStyle(0x164e63, 0.8)
    graphics.fillTriangle(48, 26, 76, 26, 73, 50)
    graphics.fillTriangle(83, 26, 109, 27, 112, 50)
    graphics.lineStyle(2, 0x67e8f9, 0.25)
    graphics.lineBetween(96, 28, 86, 48)
    graphics.lineBetween(66, 27, 57, 47)
    graphics.fillStyle(0x9a3412, 0.72)
    graphics.fillCircle(29, 57, 9)
    graphics.fillCircle(130, 64, 12)
    graphics.fillStyle(0x111827, 1)
    graphics.fillCircle(43, 80, 14)
    graphics.fillCircle(122, 80, 14)
    graphics.fillStyle(0x64748b, 1)
    graphics.fillCircle(43, 80, 5)
    graphics.fillCircle(122, 80, 5)
  })
}

function createTruckWreckTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-wreck-truck', 270, 146, (graphics) => {
    graphics.fillStyle(0x000000, 0.5)
    graphics.fillEllipse(135, 129, 232, 28)
    graphics.fillStyle(0x303640, 1)
    graphics.fillRoundedRect(22, 52, 169, 70, 12)
    graphics.fillStyle(0x3f4752, 1)
    graphics.fillRoundedRect(174, 37, 73, 85, 14)
    graphics.fillStyle(0x164e63, 0.78)
    graphics.fillTriangle(184, 48, 214, 48, 209, 78)
    graphics.fillTriangle(218, 48, 239, 51, 239, 79)
    graphics.fillStyle(0x171d24, 1)
    graphics.fillRect(35, 62, 142, 46)
    graphics.lineStyle(4, 0x525b66, 1)
    for (let x = 45; x <= 168; x += 28) {
      graphics.lineBetween(x, 64, x, 107)
    }
    graphics.fillStyle(0x9a3412, 0.78)
    graphics.fillCircle(50, 83, 15)
    graphics.fillCircle(154, 91, 17)
    graphics.fillCircle(224, 98, 11)
    graphics.fillStyle(0x0f172a, 1)
    graphics.fillCircle(65, 120, 19)
    graphics.fillCircle(167, 120, 19)
    graphics.fillCircle(221, 120, 19)
    graphics.fillStyle(0x64748b, 1)
    graphics.fillCircle(65, 120, 7)
    graphics.fillCircle(167, 120, 7)
    graphics.fillCircle(221, 120, 7)
    graphics.lineStyle(3, 0xf97316, 0.45)
    graphics.lineBetween(180, 42, 240, 112)
  })
}

function createBarrierTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-barrier', 122, 68, (graphics) => {
    graphics.fillStyle(0x000000, 0.4)
    graphics.fillEllipse(61, 59, 108, 14)
    graphics.fillStyle(0x475569, 1)
    graphics.fillRoundedRect(7, 22, 108, 32, 7)
    graphics.fillStyle(0xf59e0b, 1)
    for (let x = 12; x < 108; x += 28) {
      graphics.fillTriangle(x, 24, x + 15, 24, x, 51)
      graphics.fillTriangle(x + 15, 24, x + 27, 24, x + 15, 51)
    }
    graphics.fillStyle(0x1f2937, 1)
    graphics.fillRect(17, 53, 12, 10)
    graphics.fillRect(93, 53, 12, 10)
    graphics.lineStyle(3, 0x94a3b8, 0.45)
    graphics.strokeRoundedRect(7, 22, 108, 32, 7)
  })
}

function createRuinedWallTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'obstacle-wall', 242, 112, (graphics) => {
    graphics.fillStyle(0x000000, 0.43)
    graphics.fillEllipse(121, 102, 212, 20)
    graphics.fillStyle(0x374151, 1)
    graphics.fillRect(15, 39, 211, 59)
    graphics.fillStyle(0x4b5563, 1)
    for (let row = 0; row < 3; row++) {
      const offset = row % 2 === 0 ? 0 : 22
      for (let x = 18 - offset; x < 226; x += 45) {
        graphics.fillRoundedRect(x, 42 + row * 19, 41, 15, 3)
      }
    }
    graphics.fillStyle(0x111827, 1)
    graphics.fillTriangle(90, 36, 118, 36, 103, 72)
    graphics.fillTriangle(172, 38, 201, 38, 187, 69)
    graphics.lineStyle(3, 0x9ca3af, 0.3)
    graphics.lineBetween(18, 59, 224, 59)
    graphics.lineBetween(18, 78, 224, 78)
    graphics.fillStyle(0x7c2d12, 0.55)
    graphics.fillCircle(57, 72, 8)
    graphics.fillCircle(211, 54, 7)
  })
}

function createEnemyTextures(scene: Phaser.Scene) {
  createMutantTexture(scene)
  createCrawlerTexture(scene)
  createBruteTexture(scene)
  createShooterTexture(scene)
  createBomberTexture(scene)
  createScattererTexture(scene)
  createHealerTexture(scene)
  createShielderTexture(scene)
  createDeathBufferTexture(scene)
  createBroodMotherTexture(scene)
  createToxicTexture(scene)
  createFlameTexture(scene)
  createLegacyEnemyTexture(scene)
}

function createMutantTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-mutant', 84, 96, (graphics) => {
    graphics.fillStyle(0x2a0d0d, 1)
    graphics.fillRoundedRect(21, 42, 18, 34, 8)
    graphics.fillRoundedRect(47, 42, 18, 34, 8)
    graphics.fillStyle(0x511313, 1)
    graphics.fillRoundedRect(25, 28, 34, 42, 14)
    graphics.fillCircle(42, 24, 18)
    graphics.fillStyle(0x8b1e1e, 1)
    graphics.fillRoundedRect(29, 31, 25, 31, 10)
    graphics.fillCircle(42, 26, 12)
    graphics.fillStyle(0x2a0d0d, 1)
    graphics.fillTriangle(31, 16, 35, 4, 40, 18)
    graphics.fillTriangle(53, 16, 49, 4, 44, 18)
    graphics.lineStyle(6, 0x2a0d0d, 1)
    graphics.lineBetween(27, 43, 14, 61)
    graphics.lineBetween(57, 43, 70, 61)
    graphics.lineStyle(4, 0xdc2626, 0.92)
    graphics.lineBetween(13, 62, 8, 72)
    graphics.lineBetween(71, 62, 76, 72)
    drawEyes(graphics, 37, 47, 25, 4, 0xfacc15, true)
    graphics.fillStyle(0x160708, 1)
    graphics.fillRoundedRect(33, 36, 18, 7, 3)
    graphics.lineStyle(2, 0xfca5a5, 0.5)
    graphics.strokeCircle(42, 24, 18)
    graphics.fillStyle(0x451313, 1)
    graphics.fillRoundedRect(27, 74, 12, 15, 4)
    graphics.fillRoundedRect(45, 74, 12, 15, 4)
  })
}

function createCrawlerTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-crawler', 92, 64, (graphics) => {
    graphics.lineStyle(6, 0x2b0b1f, 1)
    graphics.lineBetween(27, 36, 10, 49)
    graphics.lineBetween(32, 41, 19, 58)
    graphics.lineBetween(60, 36, 77, 49)
    graphics.lineBetween(55, 41, 68, 58)
    graphics.fillStyle(0x3d1029, 1)
    graphics.fillEllipse(44, 35, 60, 32)
    graphics.fillStyle(0x701a55, 1)
    graphics.fillEllipse(47, 30, 44, 22)
    graphics.fillStyle(0x941b80, 1)
    graphics.fillEllipse(58, 32, 23, 14)
    graphics.fillStyle(0x1b0712, 1)
    graphics.fillTriangle(26, 26, 18, 16, 30, 19)
    graphics.fillTriangle(66, 26, 74, 16, 62, 19)
    graphics.fillStyle(0x0f0410, 1)
    graphics.fillCircle(22, 31, 8)
    drawEyes(graphics, 37, 49, 29, 3.6, 0xf59e0b, true)
    graphics.lineStyle(2, 0xf9a8d4, 0.42)
    graphics.strokeEllipse(44, 35, 60, 32)
  })
}

function createBruteTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-brute', 112, 112, (graphics) => {
    graphics.fillStyle(0x2f160d, 1)
    graphics.fillRoundedRect(12, 44, 26, 43, 10)
    graphics.fillRoundedRect(74, 44, 26, 43, 10)
    graphics.fillStyle(0x5b2111, 1)
    graphics.fillRoundedRect(29, 32, 54, 60, 18)
    graphics.fillCircle(56, 27, 24)
    graphics.fillStyle(0x92400e, 1)
    graphics.fillRoundedRect(35, 37, 42, 43, 12)
    graphics.fillCircle(56, 28, 16)
    graphics.fillStyle(0x21110a, 1)
    graphics.fillRoundedRect(16, 46, 18, 27, 6)
    graphics.fillRoundedRect(78, 46, 18, 27, 6)
    graphics.fillStyle(0x3f230f, 1)
    graphics.fillRoundedRect(24, 18, 17, 16, 6)
    graphics.fillRoundedRect(71, 18, 17, 16, 6)
    drawEyes(graphics, 49, 63, 28, 4.4, 0xfacc15, true)
    graphics.fillStyle(0x180708, 1)
    graphics.fillRoundedRect(45, 39, 22, 8, 3)
    graphics.lineStyle(4, 0xfb923c, 0.35)
    graphics.strokeCircle(56, 27, 24)
    graphics.lineStyle(7, 0x2a120b, 1)
    graphics.lineBetween(38, 78, 34, 103)
    graphics.lineBetween(74, 78, 78, 103)
  })
}

function createShooterTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-shooter', 116, 100, (graphics) => {
    graphics.fillStyle(0x0f2330, 1)
    graphics.fillRoundedRect(22, 30, 40, 50, 16)
    graphics.fillCircle(42, 26, 18)
    graphics.fillStyle(0x1d4f67, 1)
    graphics.fillRoundedRect(27, 34, 30, 37, 11)
    graphics.fillCircle(42, 27, 12)
    drawEyes(graphics, 37, 47, 27, 3.7, 0x93c5fd, false)
    graphics.fillStyle(0x142c3a, 1)
    graphics.fillRoundedRect(57, 39, 16, 12, 4)
    graphics.fillStyle(0x344b59, 1)
    graphics.fillRoundedRect(63, 35, 36, 20, 7)
    graphics.fillRoundedRect(91, 32, 17, 26, 6)
    graphics.fillStyle(0x67e8f9, 0.82)
    graphics.fillCircle(100, 45, 6)
    graphics.fillStyle(0x082f49, 1)
    graphics.fillRoundedRect(31, 75, 11, 16, 4)
    graphics.fillRoundedRect(46, 75, 11, 16, 4)
    graphics.lineStyle(3, 0x93c5fd, 0.4)
    graphics.lineBetween(70, 45, 100, 45)
  })
}

function createBomberTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-bomber', 96, 102, (graphics) => {
    graphics.fillStyle(0x3a2711, 1)
    graphics.fillRoundedRect(33, 72, 12, 17, 4)
    graphics.fillRoundedRect(51, 72, 12, 17, 4)
    graphics.fillStyle(0x6b4420, 1)
    graphics.fillCircle(48, 51, 31)
    graphics.fillStyle(0xa16207, 1)
    graphics.fillCircle(48, 48, 26)
    graphics.fillStyle(0xfacc15, 0.46)
    graphics.fillCircle(48, 49, 17)
    graphics.lineStyle(4, 0x3a2711, 1)
    graphics.lineBetween(48, 19, 57, 8)
    graphics.lineBetween(57, 8, 67, 15)
    graphics.fillStyle(0xfb923c, 1)
    graphics.fillCircle(69, 15, 6)
    graphics.fillStyle(0x2a0d0d, 1)
    graphics.fillRoundedRect(31, 39, 34, 8, 4)
    graphics.lineStyle(4, 0x7f1d1d, 1)
    graphics.lineBetween(32, 34, 40, 31)
    graphics.lineBetween(56, 31, 64, 34)
    graphics.fillStyle(0xffffff, 1)
    graphics.fillEllipse(39, 42, 6, 4)
    graphics.fillEllipse(57, 42, 6, 4)
    graphics.fillStyle(0xef4444, 1)
    graphics.fillCircle(39, 42, 2)
    graphics.fillCircle(57, 42, 2)
    graphics.fillStyle(0xf59e0b, 1)
    graphics.fillCircle(48, 57, 10)
    graphics.fillStyle(0xfef3c7, 0.8)
    graphics.fillCircle(45, 54, 3)
    graphics.lineStyle(3, 0xfef08a, 0.45)
    graphics.strokeCircle(48, 51, 31)
  })
}

function createScattererTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-scatterer', 116, 104, (graphics) => {
    graphics.fillStyle(0x21103e, 1)
    graphics.fillRoundedRect(24, 31, 42, 50, 16)
    graphics.fillCircle(45, 28, 18)
    graphics.fillStyle(0x5b21b6, 1)
    graphics.fillRoundedRect(29, 35, 32, 36, 11)
    graphics.fillCircle(45, 29, 12)
    drawEyes(graphics, 40, 50, 29, 3.7, 0xe9d5ff, false)
    const barrels = [22, 34, 46, 58, 70]
    for (let i = 0; i < barrels.length; i++) {
      const offset = Math.abs(i - 2)
      graphics.fillStyle(0x2e1065, 1)
      graphics.fillRoundedRect(61 + offset * 2, barrels[i] + 10, 34, 7, 4)
      graphics.fillStyle(0xc084fc, 0.78)
      graphics.fillCircle(95, barrels[i] + 13, 3.5)
    }
    graphics.fillStyle(0x26113f, 1)
    graphics.fillRoundedRect(31, 74, 11, 16, 4)
    graphics.fillRoundedRect(47, 74, 11, 16, 4)
    graphics.lineStyle(2, 0xd8b4fe, 0.38)
    graphics.strokeCircle(45, 28, 18)
  })
}

function createHealerTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-healer', 104, 118, (graphics) => {
    graphics.fillStyle(0x10261a, 1)
    graphics.fillTriangle(25, 103, 51, 42, 78, 103)
    graphics.fillStyle(0x166534, 1)
    graphics.fillTriangle(31, 96, 51, 49, 71, 96)
    graphics.fillStyle(0x0f172a, 1)
    graphics.fillCircle(51, 28, 19)
    graphics.fillStyle(0x1f5030, 1)
    graphics.fillCircle(51, 29, 13)
    drawEyes(graphics, 46, 56, 29, 3.4, 0xbbf7d0, false)
    drawMedicalCross(graphics, 51, 67, 20, 0x86efac)
    graphics.lineStyle(5, 0x6b4420, 1)
    graphics.lineBetween(79, 18, 79, 100)
    graphics.fillStyle(0x22c55e, 1)
    graphics.fillCircle(79, 14, 10)
    graphics.fillStyle(0xd9f99d, 0.85)
    graphics.fillCircle(75, 10, 4)
    graphics.lineStyle(2, 0x86efac, 0.4)
    graphics.strokeCircle(51, 28, 19)
  })
}

function createShielderTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-shielder', 112, 116, (graphics) => {
    graphics.fillStyle(0x0f172a, 1)
    graphics.fillRoundedRect(18, 36, 42, 50, 16)
    graphics.fillCircle(39, 31, 18)
    graphics.fillStyle(0x1e3a8a, 1)
    graphics.fillRoundedRect(23, 40, 32, 36, 11)
    graphics.fillCircle(39, 32, 12)
    drawEyes(graphics, 34, 44, 32, 3.5, 0xbfdbfe, false)
    drawShieldShape(graphics, 79, 59, 38, 59, 0x1d4ed8, 0xdbeafe)
    graphics.fillStyle(0x60a5fa, 0.9)
    graphics.fillCircle(79, 52, 7)
    graphics.lineStyle(3, 0xdbeafe, 0.7)
    graphics.lineBetween(79, 41, 79, 72)
    graphics.lineBetween(67, 52, 91, 52)
    graphics.fillStyle(0x0b1120, 1)
    graphics.fillRoundedRect(28, 79, 10, 16, 4)
    graphics.fillRoundedRect(42, 79, 10, 16, 4)
  })
}

function createDeathBufferTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-death-buffer', 98, 102, (graphics) => {
    graphics.fillStyle(0x2c1207, 1)
    graphics.fillRoundedRect(24, 36, 50, 50, 17)
    graphics.fillCircle(49, 29, 19)
    graphics.fillStyle(0x7c2d12, 1)
    graphics.fillRoundedRect(28, 40, 42, 37, 12)
    graphics.fillCircle(49, 30, 13)
    drawEyes(graphics, 44, 54, 30, 3.6, 0xfdba74, false)
    graphics.fillStyle(0xf97316, 0.88)
    graphics.fillCircle(49, 60, 12)
    graphics.fillStyle(0xffedd5, 0.82)
    graphics.fillCircle(45, 56, 3)
    graphics.lineStyle(3, 0xfb923c, 0.78)
    graphics.strokeCircle(49, 60, 16)
    graphics.lineStyle(2, 0xf59e0b, 0.65)
    graphics.lineBetween(49, 43, 49, 78)
    graphics.lineBetween(33, 60, 65, 60)
    graphics.fillStyle(0x201109, 1)
    graphics.fillRoundedRect(32, 81, 10, 15, 4)
    graphics.fillRoundedRect(56, 81, 10, 15, 4)
  })
}

function createBroodMotherTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-brood-mother', 138, 114, (graphics) => {
    graphics.fillStyle(0x2f0a28, 1)
    graphics.fillEllipse(69, 71, 122, 74)
    graphics.fillStyle(0x6b145b, 1)
    graphics.fillEllipse(69, 63, 106, 58)
    graphics.fillStyle(0xbe3ba5, 0.3)
    graphics.fillEllipse(62, 55, 62, 34)
    graphics.fillStyle(0xf0abfc, 0.78)
    const eggs = [
      [40, 71, 10], [60, 67, 12], [81, 73, 10], [96, 53, 9], [56, 49, 8], [76, 49, 9],
    ] as const
    for (const [x, y, r] of eggs) {
      graphics.fillCircle(x, y, r)
      graphics.fillStyle(0x86198f, 0.85)
      graphics.fillCircle(x + 2, y + 2, Math.max(3, r * 0.42))
      graphics.fillStyle(0xf0abfc, 0.78)
    }
    graphics.lineStyle(8, 0x58124d, 1)
    graphics.lineBetween(34, 79, 18, 100)
    graphics.lineBetween(103, 79, 120, 100)
    graphics.lineBetween(50, 84, 42, 106)
    graphics.lineBetween(88, 84, 96, 106)
    drawEyes(graphics, 59, 79, 48, 4, 0xfdf4ff, false)
    graphics.fillStyle(0x3b0d32, 1)
    graphics.fillRoundedRect(58, 56, 23, 8, 3)
    graphics.lineStyle(3, 0xf9a8d4, 0.45)
    graphics.strokeEllipse(69, 71, 122, 74)
  })
}

function createToxicTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-toxic', 98, 104, (graphics) => {
    graphics.fillStyle(0x0e2817, 1)
    graphics.fillRoundedRect(21, 33, 56, 55, 18)
    graphics.fillCircle(49, 28, 18)
    graphics.fillStyle(0x15803d, 1)
    graphics.fillRoundedRect(25, 37, 48, 42, 13)
    graphics.fillCircle(49, 29, 12)
    drawEyes(graphics, 44, 54, 29, 3.6, 0xd9f99d, false)
    graphics.fillStyle(0x84cc16, 0.9)
    graphics.fillCircle(30, 57, 10)
    graphics.fillCircle(66, 61, 8)
    graphics.fillCircle(56, 45, 6)
    graphics.fillStyle(0xd9f99d, 0.6)
    graphics.fillCircle(27, 54, 3)
    graphics.fillCircle(64, 58, 2.5)
    graphics.fillStyle(0x1a2b10, 1)
    graphics.fillRoundedRect(31, 83, 10, 14, 4)
    graphics.fillRoundedRect(57, 83, 10, 14, 4)
    graphics.lineStyle(2, 0xa3e635, 0.42)
    graphics.strokeCircle(49, 28, 18)
  })
}

function createFlameTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-flame', 98, 108, (graphics) => {
    graphics.fillStyle(0x34140a, 1)
    graphics.fillRoundedRect(23, 40, 52, 47, 16)
    graphics.fillStyle(0x7c2d12, 1)
    graphics.fillRoundedRect(27, 43, 44, 39, 12)
    graphics.fillCircle(49, 30, 16)
    graphics.fillStyle(0xf97316, 1)
    graphics.fillTriangle(36, 34, 49, 6, 58, 34)
    graphics.fillTriangle(31, 38, 42, 17, 47, 40)
    graphics.fillTriangle(52, 39, 60, 16, 67, 41)
    graphics.fillStyle(0xfacc15, 0.86)
    graphics.fillTriangle(41, 32, 49, 13, 54, 33)
    drawEyes(graphics, 44, 54, 31, 3.3, 0xfef08a, true)
    graphics.fillStyle(0xf59e0b, 0.8)
    graphics.fillCircle(49, 58, 9)
    graphics.fillStyle(0x2b1008, 1)
    graphics.fillRoundedRect(31, 82, 10, 15, 4)
    graphics.fillRoundedRect(57, 82, 10, 15, 4)
    graphics.lineStyle(2, 0xfbbf24, 0.4)
    graphics.strokeCircle(49, 30, 16)
  })
}

function createLegacyEnemyTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'enemy-placeholder', 84, 96, (graphics) => {
    graphics.fillStyle(0x5b1818, 1)
    graphics.fillRoundedRect(25, 31, 34, 42, 14)
    graphics.fillCircle(42, 26, 18)
    graphics.fillStyle(0x8b1e1e, 1)
    graphics.fillRoundedRect(29, 34, 25, 31, 10)
    graphics.fillCircle(42, 27, 12)
    drawEyes(graphics, 37, 47, 27, 4, 0xfacc15, true)
  })
}

function createMiniBossTextures(scene: Phaser.Scene) {
  createMutantGuardianTexture(scene)
  createPlagueWardenTexture(scene)
  createBroodTyrantTexture(scene)
  createInfernalExecutionerTexture(scene)
  createLegacyMiniBossTexture(scene)
}

function createMutantGuardianTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'mini-mutant-guardian', 156, 164, (graphics) => {
    graphics.fillStyle(0x2f130f, 1)
    graphics.fillRoundedRect(25, 65, 34, 56, 13)
    graphics.fillRoundedRect(97, 65, 34, 56, 13)
    graphics.fillStyle(0x5b1f18, 1)
    graphics.fillRoundedRect(47, 43, 62, 77, 24)
    graphics.fillCircle(78, 39, 29)
    graphics.fillStyle(0x8f3528, 1)
    graphics.fillRoundedRect(55, 49, 46, 52, 16)
    graphics.fillCircle(78, 40, 19)
    graphics.fillStyle(0x2a0d0d, 1)
    graphics.fillTriangle(56, 22, 63, 6, 70, 26)
    graphics.fillTriangle(100, 22, 93, 6, 86, 26)
    drawEyes(graphics, 71, 85, 40, 5.3, 0xfacc15, true)
    graphics.fillStyle(0x180708, 1)
    graphics.fillRoundedRect(66, 54, 24, 9, 4)
    graphics.fillStyle(0x23110d, 1)
    graphics.fillRoundedRect(24, 73, 23, 33, 8)
    graphics.fillRoundedRect(109, 73, 23, 33, 8)
    graphics.lineStyle(8, 0x2a120b, 1)
    graphics.lineBetween(55, 101, 47, 149)
    graphics.lineBetween(101, 101, 109, 149)
    graphics.lineStyle(4, 0xfb923c, 0.4)
    graphics.strokeCircle(78, 39, 29)
  })
}

function createPlagueWardenTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'mini-plague-warden', 160, 174, (graphics) => {
    graphics.fillStyle(0x0d1f13, 1)
    graphics.fillTriangle(34, 157, 80, 51, 126, 157)
    graphics.fillStyle(0x166534, 1)
    graphics.fillTriangle(41, 148, 80, 61, 119, 148)
    graphics.fillStyle(0x111827, 1)
    graphics.fillCircle(80, 41, 25)
    graphics.fillStyle(0x1f5030, 1)
    graphics.fillCircle(80, 43, 17)
    drawEyes(graphics, 74, 86, 43, 4.2, 0xd9f99d, false)
    drawMedicalCross(graphics, 80, 84, 22, 0x86efac)
    graphics.lineStyle(7, 0x654321, 1)
    graphics.lineBetween(126, 21, 126, 151)
    graphics.fillStyle(0x65a30d, 1)
    graphics.fillCircle(126, 18, 14)
    graphics.fillStyle(0xd9f99d, 0.9)
    graphics.fillCircle(121, 13, 5)
    graphics.fillStyle(0x365314, 1)
    graphics.fillRoundedRect(17, 88, 29, 46, 10)
    graphics.fillStyle(0xa3e635, 0.75)
    graphics.fillCircle(32, 102, 10)
    graphics.fillCircle(34, 120, 8)
    graphics.lineStyle(3, 0x86efac, 0.42)
    graphics.strokeCircle(80, 41, 25)
  })
}

function createBroodTyrantTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'mini-brood-tyrant', 184, 152, (graphics) => {
    graphics.lineStyle(9, 0x58124d, 1)
    graphics.lineBetween(46, 100, 24, 132)
    graphics.lineBetween(67, 110, 56, 145)
    graphics.lineBetween(138, 100, 160, 132)
    graphics.lineBetween(117, 110, 128, 145)
    graphics.fillStyle(0x2f0a28, 1)
    graphics.fillEllipse(92, 90, 154, 89)
    graphics.fillStyle(0x6b145b, 1)
    graphics.fillEllipse(92, 80, 134, 72)
    graphics.fillStyle(0xf0abfc, 0.76)
    const sacs = [[57,74,16],[89,61,19],[123,72,17],[70,98,16],[106,100,18],[137,92,13]]
    for (const [x,y,r] of sacs) {
      graphics.fillCircle(x, y, r)
      graphics.fillStyle(0x86198f, 0.88)
      graphics.fillCircle(x + 3, y + 3, Math.max(5, r * 0.44))
      graphics.fillStyle(0xf0abfc, 0.76)
    }
    drawEyes(graphics, 82, 102, 52, 5.2, 0xfdf4ff, true)
    graphics.fillStyle(0x3b0d32, 1)
    graphics.fillRoundedRect(78, 66, 28, 9, 4)
    graphics.lineStyle(4, 0xf9a8d4, 0.46)
    graphics.strokeEllipse(92, 90, 154, 89)
  })
}

function createInfernalExecutionerTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'mini-infernal-executioner', 188, 182, (graphics) => {
    graphics.fillStyle(0x21110a, 1)
    graphics.fillTriangle(39, 168, 90, 54, 133, 168)
    graphics.fillStyle(0x7c2d12, 1)
    graphics.fillTriangle(49, 159, 90, 63, 124, 159)
    graphics.fillStyle(0x111827, 1)
    graphics.fillCircle(90, 42, 23)
    graphics.fillTriangle(64, 49, 90, 12, 117, 49)
    graphics.fillStyle(0x431407, 1)
    graphics.fillRoundedRect(73, 36, 34, 18, 6)
    drawEyes(graphics, 84, 96, 46, 4.5, 0xfbbf24, true)
    graphics.lineStyle(8, 0x4a3728, 1)
    graphics.lineBetween(135, 24, 117, 160)
    graphics.fillStyle(0x475569, 1)
    graphics.fillTriangle(122, 24, 176, 8, 159, 69)
    graphics.fillStyle(0xcbd5e1, 1)
    graphics.fillTriangle(130, 23, 169, 12, 156, 56)
    graphics.fillStyle(0xf97316, 0.82)
    graphics.fillTriangle(66, 111, 84, 72, 92, 113)
    graphics.fillTriangle(89, 114, 106, 77, 113, 122)
    graphics.lineStyle(4, 0xfbbf24, 0.4)
    graphics.strokeCircle(90, 42, 23)
  })
}

function createLegacyMiniBossTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'mini-boss-placeholder', 156, 164, (graphics) => {
    graphics.fillStyle(0x4c1d95, 1)
    graphics.fillCircle(78, 76, 48)
    graphics.fillStyle(0x7c3aed, 1)
    graphics.fillCircle(78, 71, 34)
    drawEyes(graphics, 66, 90, 72, 6, 0xfacc15, true)
  })
}

function createBossTextures(scene: Phaser.Scene) {
  createDevourerTexture(scene)
  createAegisColossusTexture(scene)
  createBroodQueenTexture(scene)
  createInfernalEngineTexture(scene)
  createLegacyBossTexture(scene)
}

function createDevourerTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'boss-devourer', 228, 202, (graphics) => {
    graphics.fillStyle(0x3b0c0c, 1)
    graphics.fillEllipse(114, 120, 192, 126)
    graphics.fillStyle(0x7f1d1d, 1)
    graphics.fillEllipse(114, 108, 168, 104)
    graphics.fillStyle(0x4b1010, 1)
    graphics.fillTriangle(44, 71, 24, 31, 66, 77)
    graphics.fillTriangle(184, 71, 204, 31, 162, 77)
    graphics.fillTriangle(82, 51, 94, 12, 106, 57)
    graphics.fillTriangle(146, 51, 134, 12, 122, 57)
    graphics.fillStyle(0x09090b, 1)
    graphics.fillEllipse(114, 120, 110, 62)
    for (let i = 0; i < 9; i++) {
      const x = 71 + i * 10
      const top = i % 2 === 0 ? 95 : 100
      graphics.fillStyle(0xfff7ed, 1)
      graphics.fillTriangle(x, top, x + 8, top, x + 4, 114)
      graphics.fillTriangle(x, 142, x + 8, 142, x + 4, 128)
    }
    drawEyes(graphics, 83, 145, 79, 7.5, 0xfacc15, true)
    graphics.fillStyle(0xef4444, 0.72)
    graphics.fillEllipse(114, 128, 38, 14)
    graphics.lineStyle(5, 0xfca5a5, 0.44)
    graphics.strokeEllipse(114, 120, 192, 126)
  })
}

function createAegisColossusTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'boss-aegis-colossus', 228, 218, (graphics) => {
    graphics.fillStyle(0x0f172a, 1)
    graphics.fillRoundedRect(31, 78, 48, 100, 16)
    graphics.fillRoundedRect(149, 78, 48, 100, 16)
    graphics.fillStyle(0x1d4ed8, 1)
    graphics.fillRoundedRect(56, 56, 110, 121, 28)
    graphics.fillCircle(111, 51, 35)
    graphics.fillStyle(0x60a5fa, 0.28)
    graphics.fillRoundedRect(66, 66, 90, 87, 18)
    graphics.fillCircle(111, 53, 24)
    graphics.fillStyle(0x0b1120, 1)
    graphics.fillRoundedRect(87, 46, 48, 16, 6)
    drawEyes(graphics, 103, 119, 54, 5.8, 0xdbeafe, false)
    drawShieldShape(graphics, 177, 124, 76, 118, 0x2563eb, 0xe0f2fe)
    graphics.fillStyle(0x93c5fd, 0.86)
    graphics.fillCircle(177, 112, 14)
    graphics.lineStyle(5, 0xdbeafe, 0.66)
    graphics.lineBetween(177, 81, 177, 149)
    graphics.lineBetween(148, 112, 206, 112)
    graphics.fillStyle(0x0f172a, 1)
    graphics.fillRoundedRect(67, 167, 27, 31, 9)
    graphics.fillRoundedRect(128, 167, 27, 31, 9)
    graphics.lineStyle(4, 0x93c5fd, 0.36)
    graphics.strokeCircle(111, 51, 35)
  })
}

function createBroodQueenTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'boss-brood-queen', 246, 198, (graphics) => {
    graphics.lineStyle(12, 0x58124d, 1)
    graphics.lineBetween(56, 120, 18, 180)
    graphics.lineBetween(80, 139, 55, 194)
    graphics.lineBetween(190, 120, 228, 180)
    graphics.lineBetween(166, 139, 191, 194)
    graphics.fillStyle(0x2f0a28, 1)
    graphics.fillEllipse(123, 122, 214, 118)
    graphics.fillStyle(0x6b145b, 1)
    graphics.fillEllipse(123, 108, 190, 98)
    graphics.fillStyle(0xf0abfc, 0.8)
    const eggs = [[74,120,18],[107,114,22],[147,124,21],[182,132,17],[97,82,16],[153,81,18]]
    for (const [x,y,r] of eggs) {
      graphics.fillCircle(x, y, r)
      graphics.fillStyle(0x86198f, 0.88)
      graphics.fillCircle(x + 4, y + 4, Math.max(6, r * 0.45))
      graphics.fillStyle(0xf0abfc, 0.8)
    }
    graphics.fillStyle(0xbe3ba5, 0.28)
    graphics.fillEllipse(121, 94, 88, 46)
    drawEyes(graphics, 107, 139, 70, 6.6, 0xfdf4ff, true)
    graphics.fillStyle(0x3b0d32, 1)
    graphics.fillRoundedRect(108, 83, 30, 11, 4)
    graphics.fillStyle(0xfacc15, 1)
    graphics.fillTriangle(92, 46, 106, 14, 116, 49)
    graphics.fillTriangle(116, 48, 132, 9, 143, 52)
    graphics.fillTriangle(141, 48, 157, 18, 164, 58)
    graphics.lineStyle(5, 0xf9a8d4, 0.46)
    graphics.strokeEllipse(123, 122, 214, 118)
  })
}

function createInfernalEngineTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'boss-infernal-engine', 232, 214, (graphics) => {
    graphics.fillStyle(0x1f2937, 1)
    graphics.fillRoundedRect(35, 56, 158, 130, 24)
    graphics.fillStyle(0x374151, 1)
    graphics.fillRoundedRect(50, 67, 128, 108, 18)
    graphics.fillStyle(0x111827, 1)
    graphics.fillRoundedRect(81, 21, 66, 48, 14)
    graphics.fillStyle(0x7c2d12, 1)
    graphics.fillCircle(115, 118, 42)
    graphics.fillStyle(0xf97316, 0.94)
    graphics.fillCircle(115, 118, 29)
    graphics.fillStyle(0xfacc15, 0.92)
    graphics.fillCircle(115, 118, 15)
    graphics.fillStyle(0xfef3c7, 0.9)
    graphics.fillCircle(108, 109, 5)
    graphics.fillStyle(0x4b5563, 1)
    graphics.fillRoundedRect(9, 79, 50, 23, 8)
    graphics.fillRoundedRect(171, 79, 50, 23, 8)
    graphics.fillStyle(0xf97316, 0.88)
    graphics.fillCircle(11, 91, 8)
    graphics.fillCircle(219, 91, 8)
    graphics.fillStyle(0x0f172a, 1)
    graphics.fillRoundedRect(51, 173, 42, 28, 8)
    graphics.fillRoundedRect(137, 173, 42, 28, 8)
    graphics.lineStyle(7, 0x7c2d12, 1)
    graphics.lineBetween(68, 44, 51, 8)
    graphics.lineBetween(162, 44, 179, 8)
    graphics.fillStyle(0xf97316, 0.86)
    graphics.fillTriangle(42, 39, 52, 6, 62, 43)
    graphics.fillTriangle(168, 44, 179, 6, 190, 39)
    graphics.lineStyle(4, 0xfbbf24, 0.42)
    graphics.strokeCircle(115, 118, 42)
  })
}

function createLegacyBossTexture(scene: Phaser.Scene) {
  generateTexture(scene, 'boss-placeholder', 228, 202, (graphics) => {
    graphics.fillStyle(0x7f1d1d, 1)
    graphics.fillEllipse(114, 112, 182, 128)
    graphics.fillStyle(0xc2410c, 1)
    graphics.fillEllipse(114, 103, 142, 96)
    drawEyes(graphics, 93, 135, 88, 8, 0xfacc15, true)
  })
}
function createPlayerTexture(scene: Phaser.Scene) {
    if (
      scene.textures.exists(
        'player-placeholder',
      )
    ) {
      return
    }

    const graphics =
      scene.add.graphics()

    graphics.fillStyle(
      0x172554,
      1,
    )

    graphics.fillRoundedRect(
      14,
      29,
      36,
      34,
      12,
    )

    graphics.fillStyle(
      0x2563eb,
      1,
    )

    graphics.fillCircle(
      18,
      38,
      10,
    )

    graphics.fillCircle(
      46,
      38,
      10,
    )

    graphics.fillStyle(
      0x1d4ed8,
      1,
    )

    graphics.fillRoundedRect(
      19,
      28,
      26,
      34,
      9,
    )

    graphics.fillStyle(
      0x60a5fa,
      1,
    )

    graphics.fillRoundedRect(
      25,
      32,
      14,
      25,
      5,
    )

    graphics.fillStyle(
      0xdbeafe,
      1,
    )

    graphics.fillCircle(
      32,
      20,
      15,
    )

    graphics.fillStyle(
      0x1e3a8a,
      1,
    )

    graphics.fillRoundedRect(
      17,
      8,
      30,
      18,
      9,
    )

    graphics.fillStyle(
      0x67e8f9,
      1,
    )

    graphics.fillRoundedRect(
      22,
      17,
      21,
      8,
      4,
    )

    graphics.fillStyle(
      0xffffff,
      0.8,
    )

    graphics.fillRoundedRect(
      25,
      18,
      7,
      2,
      1,
    )

    graphics.lineStyle(
      2,
      0xbfdbfe,
      0.9,
    )

    graphics.strokeRoundedRect(
      18,
      27,
      28,
      36,
      10,
    )

    graphics.generateTexture(
      'player-placeholder',
      64,
      72,
    )

    graphics.destroy()
  }

function createProjectileTexture(scene: Phaser.Scene) {
    if (
      scene.textures.exists(
        'player-projectile',
      )
    ) {
      return
    }

    const graphics =
      scene.add.graphics()

    graphics.fillStyle(
      0x0e7490,
      0.45,
    )

    graphics.fillCircle(8, 8, 8)

    graphics.fillStyle(
      0x22d3ee,
      1,
    )

    graphics.fillCircle(8, 8, 5)

    graphics.fillStyle(
      0xecfeff,
      1,
    )

    graphics.fillCircle(6, 6, 2)

    graphics.generateTexture(
      'player-projectile',
      16,
      16,
    )

    graphics.destroy()
  }

function createExperienceOrbTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('experience-orb')) {
    return
  }

  const graphics = scene.add.graphics()

  graphics.fillStyle(0x1e1b4b, 0.9)
  graphics.fillCircle(14, 14, 12)

  graphics.fillStyle(0x7c3aed, 1)
  graphics.fillCircle(14, 14, 9)

  graphics.fillStyle(0xc4b5fd, 1)
  graphics.fillCircle(11, 10, 4)

  graphics.fillStyle(0xffffff, 0.9)
  graphics.fillCircle(10, 9, 2)

  graphics.lineStyle(2, 0xa78bfa, 0.9)
  graphics.strokeCircle(14, 14, 11)

  graphics.generateTexture('experience-orb', 28, 28)
  graphics.destroy()
}

function createSkillVisualTextures(scene: Phaser.Scene) {
  generateTexture(scene, 'skill-orbit-blade', 74, 26, (graphics) => {
    graphics.fillStyle(0x0f172a, 0.9)
    graphics.fillTriangle(4, 13, 18, 5, 18, 21)
    graphics.fillStyle(0x155e75, 1)
    graphics.fillRoundedRect(15, 8, 37, 10, 4)
    graphics.fillStyle(0x67e8f9, 1)
    graphics.fillTriangle(49, 5, 71, 13, 49, 21)
    graphics.fillStyle(0xecfeff, 0.96)
    graphics.fillTriangle(21, 10, 63, 13, 21, 15)
    graphics.fillStyle(0xf8fafc, 1)
    graphics.fillRoundedRect(9, 9, 9, 8, 3)
    graphics.lineStyle(2, 0x22d3ee, 0.75)
    graphics.lineBetween(19, 7, 50, 7)
  })

  generateTexture(scene, 'skill-ice-lance', 112, 30, (graphics) => {
    graphics.fillStyle(0x0c4a6e, 0.88)
    graphics.fillTriangle(2, 15, 24, 5, 24, 25)
    graphics.fillStyle(0x38bdf8, 1)
    graphics.fillTriangle(18, 15, 78, 5, 78, 25)
    graphics.fillStyle(0xe0f2fe, 1)
    graphics.fillTriangle(38, 15, 109, 15, 76, 3)
    graphics.fillTriangle(38, 15, 109, 15, 76, 27)
    graphics.fillStyle(0xffffff, 0.92)
    graphics.fillTriangle(48, 13, 104, 15, 48, 17)
    graphics.fillStyle(0x7dd3fc, 0.85)
    graphics.fillTriangle(28, 15, 48, 4, 48, 26)
  })

  generateTexture(scene, 'skill-combat-drone', 70, 52, (graphics) => {
    graphics.fillStyle(0x0f172a, 1)
    graphics.fillRoundedRect(21, 14, 28, 24, 8)
    graphics.fillStyle(0x065f46, 1)
    graphics.fillRoundedRect(25, 17, 20, 18, 6)
    graphics.fillStyle(0x34d399, 1)
    graphics.fillCircle(35, 26, 6)
    graphics.fillStyle(0xd1fae5, 1)
    graphics.fillCircle(33, 24, 2)
    graphics.fillStyle(0x334155, 1)
    graphics.fillRoundedRect(3, 18, 22, 8, 4)
    graphics.fillRoundedRect(45, 18, 22, 8, 4)
    graphics.fillStyle(0x10b981, 0.9)
    graphics.fillCircle(8, 22, 5)
    graphics.fillCircle(62, 22, 5)
    graphics.fillStyle(0x1f2937, 1)
    graphics.fillRoundedRect(30, 35, 10, 14, 4)
    graphics.fillStyle(0x6ee7b7, 1)
    graphics.fillCircle(35, 47, 3)
  })

  generateTexture(scene, 'skill-meteor', 72, 104, (graphics) => {
    graphics.fillStyle(0xfef3c7, 0.85)
    graphics.fillTriangle(36, 0, 18, 58, 54, 58)
    graphics.fillStyle(0xfacc15, 0.88)
    graphics.fillTriangle(36, 7, 22, 65, 50, 65)
    graphics.fillStyle(0xf97316, 0.96)
    graphics.fillTriangle(36, 20, 20, 76, 52, 76)
    graphics.fillStyle(0x7c2d12, 1)
    graphics.fillCircle(36, 78, 23)
    graphics.fillStyle(0x431407, 1)
    graphics.fillCircle(36, 81, 17)
    graphics.fillStyle(0x9a3412, 1)
    graphics.fillCircle(28, 73, 6)
    graphics.fillCircle(44, 85, 5)
    graphics.fillStyle(0xfed7aa, 0.7)
    graphics.fillCircle(28, 69, 3)
  })

  generateTexture(scene, 'skill-drone-bolt', 26, 10, (graphics) => {
    graphics.fillStyle(0x064e3b, 0.6)
    graphics.fillEllipse(12, 5, 24, 9)
    graphics.fillStyle(0x34d399, 1)
    graphics.fillRoundedRect(7, 2, 17, 6, 3)
    graphics.fillStyle(0xecfdf5, 1)
    graphics.fillCircle(22, 5, 2)
  })

  generateTexture(scene, 'skill-drone-missile', 42, 16, (graphics) => {
    graphics.fillStyle(0x1f2937, 1)
    graphics.fillRoundedRect(10, 4, 23, 8, 4)
    graphics.fillStyle(0x94a3b8, 1)
    graphics.fillTriangle(30, 3, 40, 8, 30, 13)
    graphics.fillStyle(0xf97316, 0.95)
    graphics.fillTriangle(10, 5, 1, 8, 10, 11)
    graphics.fillStyle(0xfef08a, 0.9)
    graphics.fillTriangle(8, 6, 3, 8, 8, 10)
  })
}

function createUpgradeIconTextures(scene: Phaser.Scene) {
  const ids = [
    'power-core',
    'rapid-fire',
    'mobility',
    'vitality',
    'magnetism',
    'overcharge',
    'armor-plating',
    'critical-core',
    'orbiting-blades',
    'chain-lightning',
    'plasma-nova',
    'ice-lance',
    'meteor-rain',
    'gravity-well',
    'combat-drone',
    'energy-laser',
    'multishot',
    'skill-fusion',
    'fusion-training',
    'combat-training',
    'reactor-tuning',
    'field-repair',
  ] as const

  for (const id of ids) {
    generateTexture(scene, `upgrade-icon-${id}`, 72, 72, (graphics) => {
      drawModernIconPlate(graphics, getUpgradeIconColor(id))
      drawUpgradeIconGlyph(graphics, id)
    })
  }
}

function createActiveAbilityIconTextures(scene: Phaser.Scene) {
  const ids = [
    'bullet-crown',
    'phase-dash',
    'magnetic-field',
    'renewal-pulse',
    'plasma-detonation',
    'war-overdrive',
    'aegis-fortress',
    'rift-step',
    'heaven-judgment',
    'eternal-apocalypse',
    'supreme-starfall',
    'void-dominion',
    'last-night-verdict',
  ] as const

  for (const id of ids) {
    generateTexture(scene, `active-icon-${id}`, 72, 72, (graphics) => {
      drawModernIconPlate(graphics, getActiveAbilityIconColor(id))
      drawActiveAbilityGlyph(graphics, id)
    })
  }
}

function drawModernIconPlate(
  graphics: Phaser.GameObjects.Graphics,
  color: number,
) {
  graphics.fillStyle(0x020617, 0.96)
  graphics.fillCircle(36, 36, 32)
  graphics.fillStyle(color, 0.12)
  graphics.fillCircle(36, 36, 27)
  graphics.lineStyle(3, color, 0.88)
  graphics.strokeCircle(36, 36, 31)
  graphics.lineStyle(1, 0xffffff, 0.28)
  graphics.strokeCircle(36, 36, 23)
}

function getUpgradeIconColor(id: string) {
  const colors: Record<string, number> = {
    'power-core': 0xf97316,
    'rapid-fire': 0x22d3ee,
    mobility: 0x4ade80,
    vitality: 0xef4444,
    magnetism: 0xa78bfa,
    overcharge: 0x38bdf8,
    'armor-plating': 0x94a3b8,
    'critical-core': 0xfacc15,
    'orbiting-blades': 0x22d3ee,
    'chain-lightning': 0x67e8f9,
    'plasma-nova': 0xa78bfa,
    'ice-lance': 0x7dd3fc,
    'meteor-rain': 0xfb7185,
    'gravity-well': 0x8b5cf6,
    'combat-drone': 0x34d399,
    'energy-laser': 0xf472b6,
    multishot: 0xfacc15,
    'skill-fusion': 0xf472b6,
    'fusion-training': 0xe879f9,
    'combat-training': 0xfb923c,
    'reactor-tuning': 0x06b6d4,
    'field-repair': 0x22c55e,
  }
  return colors[id] ?? 0x67e8f9
}

function getActiveAbilityIconColor(id: string) {
  const colors: Record<string, number> = {
    'bullet-crown': 0x38bdf8,
    'phase-dash': 0x22d3ee,
    'magnetic-field': 0xa855f7,
    'renewal-pulse': 0x22c55e,
    'plasma-detonation': 0xf97316,
    'war-overdrive': 0xef4444,
    'aegis-fortress': 0x60a5fa,
    'rift-step': 0x8b5cf6,
    'heaven-judgment': 0xfacc15,
    'eternal-apocalypse': 0xf43f5e,
    'supreme-starfall': 0xa855f7,
    'void-dominion': 0x2563eb,
    'last-night-verdict': 0xdc2626,
  }
  return colors[id] ?? 0x67e8f9
}

function drawUpgradeIconGlyph(
  graphics: Phaser.GameObjects.Graphics,
  id: string,
) {
  const color = getUpgradeIconColor(id)
  graphics.lineStyle(4, color, 1)
  graphics.fillStyle(color, 1)

  switch (id) {
    case 'orbiting-blades':
      drawBladeGlyph(graphics, 22, 28, 28, -0.45, color)
      drawBladeGlyph(graphics, 50, 44, 28, 2.7, color)
      break
    case 'chain-lightning':
      fillPolygonPath(graphics, [40, 10, 22, 38, 34, 38, 27, 62, 52, 31, 39, 31])
      break
    case 'plasma-nova':
      graphics.strokeCircle(36, 36, 19)
      graphics.lineStyle(2, 0xffffff, 0.8)
      graphics.strokeCircle(36, 36, 10)
      graphics.fillCircle(36, 36, 5)
      break
    case 'ice-lance':
      graphics.fillTriangle(13, 40, 57, 21, 47, 48)
      graphics.fillStyle(0xe0f2fe, 1)
      graphics.fillTriangle(23, 37, 61, 31, 47, 43)
      break
    case 'meteor-rain':
      graphics.fillTriangle(20, 10, 31, 34, 13, 31)
      graphics.fillTriangle(43, 8, 54, 34, 35, 29)
      graphics.fillCircle(22, 47, 10)
      graphics.fillCircle(48, 49, 12)
      break
    case 'gravity-well':
      graphics.fillStyle(0x020617, 1)
      graphics.fillCircle(36, 36, 14)
      graphics.lineStyle(4, color, 0.95)
      graphics.strokeCircle(36, 36, 22)
      graphics.lineStyle(2, 0xffffff, 0.65)
      graphics.beginPath()
      graphics.moveTo(12, 39)
      graphics.lineTo(23, 23)
      graphics.lineTo(43, 18)
      graphics.lineTo(58, 31)
      graphics.strokePath()
      break
    case 'combat-drone':
      graphics.fillRoundedRect(25, 25, 22, 20, 6)
      graphics.fillRoundedRect(10, 30, 17, 7, 3)
      graphics.fillRoundedRect(45, 30, 17, 7, 3)
      graphics.fillStyle(0xecfdf5, 1)
      graphics.fillCircle(36, 35, 4)
      break
    case 'energy-laser':
      graphics.lineStyle(9, color, 0.5)
      graphics.lineBetween(14, 50, 58, 21)
      graphics.lineStyle(3, 0xffffff, 1)
      graphics.lineBetween(14, 50, 58, 21)
      graphics.fillStyle(color, 1)
      graphics.fillCircle(14, 50, 7)
      break
    case 'multishot':
      graphics.lineStyle(4, color, 1)
      graphics.lineBetween(18, 52, 54, 18)
      graphics.lineBetween(18, 52, 58, 35)
      graphics.lineBetween(18, 52, 57, 52)
      graphics.fillCircle(58, 18, 4)
      graphics.fillCircle(61, 35, 4)
      graphics.fillCircle(60, 52, 4)
      break
    case 'skill-fusion':
      graphics.lineStyle(5, color, 0.95)
      graphics.strokeCircle(28, 36, 14)
      graphics.strokeCircle(44, 36, 14)
      graphics.fillStyle(0xfef3c7, 1)
      graphics.fillCircle(36, 36, 6)
      break
    case 'fusion-training':
      graphics.strokeCircle(31, 40, 15)
      graphics.strokeCircle(44, 40, 15)
      graphics.fillTriangle(36, 11, 47, 29, 25, 29)
      break
    case 'power-core':
    case 'combat-training':
      graphics.fillCircle(36, 36, 15)
      graphics.lineStyle(4, 0xffffff, 0.8)
      graphics.lineBetween(36, 14, 36, 58)
      graphics.lineBetween(14, 36, 58, 36)
      break
    case 'rapid-fire':
    case 'reactor-tuning':
      graphics.lineStyle(5, color, 1)
      graphics.lineBetween(13, 27, 54, 27)
      graphics.lineBetween(18, 37, 59, 37)
      graphics.lineBetween(13, 47, 54, 47)
      break
    case 'mobility':
      graphics.fillTriangle(15, 45, 44, 16, 44, 33)
      graphics.fillTriangle(28, 56, 57, 27, 57, 44)
      break
    case 'vitality':
    case 'field-repair':
      graphics.fillRoundedRect(31, 15, 10, 42, 3)
      graphics.fillRoundedRect(15, 31, 42, 10, 3)
      break
    case 'magnetism':
      graphics.lineStyle(8, color, 1)
      graphics.beginPath()
      graphics.moveTo(20, 18)
      graphics.lineTo(20, 42)
      graphics.lineTo(28, 53)
      graphics.lineTo(36, 56)
      graphics.lineTo(44, 53)
      graphics.lineTo(52, 42)
      graphics.lineTo(52, 18)
      graphics.strokePath()
      break
    case 'overcharge':
      fillPolygonPath(graphics, [40, 10, 22, 38, 35, 38, 28, 61, 52, 31, 39, 31])
      break
    case 'armor-plating':
      drawShieldGlyph(graphics, color)
      break
    case 'critical-core':
      graphics.strokeCircle(36, 36, 20)
      graphics.strokeCircle(36, 36, 10)
      graphics.lineBetween(36, 9, 36, 20)
      graphics.lineBetween(36, 52, 36, 63)
      graphics.lineBetween(9, 36, 20, 36)
      graphics.lineBetween(52, 36, 63, 36)
      break
    default:
      graphics.fillCircle(36, 36, 14)
  }
}

function drawActiveAbilityGlyph(
  graphics: Phaser.GameObjects.Graphics,
  id: string,
) {
  const color = getActiveAbilityIconColor(id)
  graphics.fillStyle(color, 1)
  graphics.lineStyle(4, color, 1)

  switch (id) {
    case 'bullet-crown':
      for (let index = 0; index < 8; index++) {
        const angle = (Math.PI * 2 * index) / 8
        const x = 36 + Math.cos(angle) * 20
        const y = 36 + Math.sin(angle) * 20
        graphics.fillCircle(x, y, 3)
        graphics.lineBetween(36 + Math.cos(angle) * 8, 36 + Math.sin(angle) * 8, x, y)
      }
      graphics.fillCircle(36, 36, 6)
      break
    case 'phase-dash':
      graphics.fillTriangle(13, 49, 38, 20, 38, 36)
      graphics.fillTriangle(30, 53, 59, 24, 59, 42)
      break
    case 'magnetic-field':
      graphics.strokeCircle(36, 36, 21)
      graphics.strokeCircle(36, 36, 11)
      graphics.fillCircle(36, 36, 4)
      graphics.fillCircle(16, 36, 4)
      graphics.fillCircle(56, 36, 4)
      break
    case 'renewal-pulse':
      graphics.fillRoundedRect(31, 15, 10, 42, 3)
      graphics.fillRoundedRect(15, 31, 42, 10, 3)
      graphics.lineStyle(2, 0xffffff, 0.8)
      graphics.strokeCircle(36, 36, 25)
      break
    case 'plasma-detonation':
      for (let index = 0; index < 8; index++) {
        const angle = (Math.PI * 2 * index) / 8
        graphics.lineBetween(36 + Math.cos(angle) * 10, 36 + Math.sin(angle) * 10, 36 + Math.cos(angle) * 25, 36 + Math.sin(angle) * 25)
      }
      graphics.fillCircle(36, 36, 11)
      break
    case 'war-overdrive':
      drawBladeGlyph(graphics, 28, 36, 38, -0.75, color)
      drawBladeGlyph(graphics, 44, 36, 38, 0.75 + Math.PI, color)
      break
    case 'aegis-fortress':
      drawShieldGlyph(graphics, color)
      break
    case 'rift-step':
      graphics.strokeEllipse(24, 36, 18, 42)
      graphics.strokeEllipse(50, 36, 18, 42)
      graphics.lineBetween(29, 36, 45, 36)
      break
    case 'heaven-judgment':
      fillPolygonPath(graphics, [40, 9, 20, 38, 34, 38, 27, 63, 54, 31, 40, 31])
      break
    case 'eternal-apocalypse':
      graphics.fillTriangle(36, 8, 24, 39, 48, 39)
      graphics.fillStyle(0x431407, 1)
      graphics.fillCircle(36, 49, 13)
      graphics.fillStyle(color, 0.95)
      graphics.fillCircle(31, 45, 4)
      break
    case 'supreme-starfall':
      graphics.fillStyle(0xfef08a, 1)
      fillPolygonPath(graphics, [36, 8, 41, 25, 59, 25, 44, 36, 50, 55, 36, 44, 22, 55, 28, 36, 13, 25, 31, 25])
      graphics.lineStyle(3, color, 0.92)
      graphics.lineBetween(16, 14, 29, 28)
      graphics.lineBetween(10, 25, 24, 34)
      break
    case 'void-dominion':
      graphics.lineStyle(5, 0x67e8f9, 1)
      graphics.strokeCircle(36, 36, 23)
      graphics.lineStyle(3, color, 1)
      graphics.strokeCircle(36, 36, 14)
      graphics.fillStyle(0x020617, 1)
      graphics.fillCircle(36, 36, 10)
      graphics.fillStyle(0x67e8f9, 1)
      graphics.fillCircle(36, 36, 4)
      graphics.lineStyle(2, 0xffffff, 0.78)
      graphics.lineBetween(36, 8, 36, 20)
      graphics.lineBetween(36, 52, 36, 64)
      graphics.lineBetween(8, 36, 20, 36)
      graphics.lineBetween(52, 36, 64, 36)
      break
    case 'last-night-verdict':
      graphics.lineStyle(8, color, 1)
      graphics.lineBetween(17, 17, 55, 55)
      graphics.lineBetween(55, 17, 17, 55)
      graphics.lineStyle(3, 0xfde047, 1)
      graphics.lineBetween(14, 27, 45, 58)
      graphics.lineBetween(58, 27, 27, 58)
      graphics.strokeCircle(36, 36, 25)
      break
  }
}

function drawBladeGlyph(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  length: number,
  rotation: number,
  color: number,
) {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const startX = x - cos * length * 0.38
  const startY = y - sin * length * 0.38
  const endX = x + cos * length * 0.5
  const endY = y + sin * length * 0.5
  graphics.lineStyle(6, color, 1)
  graphics.lineBetween(startX, startY, endX, endY)
  graphics.lineStyle(2, 0xffffff, 0.9)
  graphics.lineBetween(startX + 1, startY - 1, endX, endY)
  graphics.fillStyle(color, 1)
  graphics.fillCircle(startX, startY, 4)
}

function drawShieldGlyph(
  graphics: Phaser.GameObjects.Graphics,
  color: number,
) {
  graphics.fillStyle(color, 0.92)
  graphics.fillRoundedRect(21, 16, 30, 27, 7)
  graphics.fillTriangle(21, 35, 51, 35, 36, 60)
  graphics.lineStyle(3, 0xffffff, 0.72)
  graphics.lineBetween(36, 20, 36, 49)
  graphics.lineBetween(26, 33, 46, 33)
}


function fillPolygonPath(
  graphics: Phaser.GameObjects.Graphics,
  points: number[],
) {
  if (points.length < 6) {
    return
  }

  graphics.beginPath()
  graphics.moveTo(points[0], points[1])

  for (let index = 2; index < points.length; index += 2) {
    graphics.lineTo(points[index], points[index + 1])
  }

  graphics.closePath()
  graphics.fillPath()
}
