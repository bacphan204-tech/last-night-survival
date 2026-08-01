import {
  DEFAULT_STARTING_PROTOCOL_ID,
  applyStartingProtocolToStats,
  combineDamageReduction,
  getStartingProtocolDefinition,
  normalizeStartingProtocolId,
  type StartingProtocolDefinition,
  type StartingProtocolId,
} from '../data/startingProtocols'
import type { PlayerStats, UpgradeId } from '../types/game'
import { notifyCloudProgressChanged } from './PlayerProfileSystem'

const STORAGE_KEY = 'last-night-survival:starting-protocol:v1'

let runtimeProtocolId: StartingProtocolId = DEFAULT_STARTING_PROTOCOL_ID

export function setRuntimeStartingProtocolId(value: unknown) {
  runtimeProtocolId = normalizeStartingProtocolId(value)
  return runtimeProtocolId
}

export function getRuntimeStartingProtocolId() {
  return runtimeProtocolId
}

export class StartingProtocolSystem {
  getSelectedId(): StartingProtocolId {
    if (typeof window === 'undefined') {
      return runtimeProtocolId
    }

    try {
      return normalizeStartingProtocolId(
        window.localStorage.getItem(STORAGE_KEY),
      )
    } catch {
      return runtimeProtocolId
    }
  }

  setSelectedId(value: unknown): StartingProtocolId {
    const id = normalizeStartingProtocolId(value)
    runtimeProtocolId = id

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, id)
        notifyCloudProgressChanged()
      } catch {
        // Trình duyệt có thể chặn localStorage; lựa chọn vẫn dùng được trong phiên hiện tại.
      }
    }

    return id
  }

  resolveId(value: unknown): StartingProtocolId {
    return normalizeStartingProtocolId(value)
  }

  getDefinition(id: StartingProtocolId): StartingProtocolDefinition {
    return getStartingProtocolDefinition(id)
  }

  applyToStats(stats: PlayerStats, id: StartingProtocolId) {
    applyStartingProtocolToStats(stats, id)
    return this.getDefinition(id)
  }

  reconcileAfterUpgrade(
    stats: PlayerStats,
    protocolId: StartingProtocolId,
    upgradeId: UpgradeId,
  ) {
    if (protocolId !== 'guardian' || upgradeId !== 'armor-plating') {
      return
    }

    const bonus = this.getDefinition(protocolId).modifiers.damageReductionBonus
    stats.damageReduction = combineDamageReduction(
      stats.damageReduction,
      bonus,
    )
  }
}
