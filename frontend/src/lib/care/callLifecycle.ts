import { activeCallFromLive } from './calls'
import type { AppState } from './types'

/** Fence requests across both optimistic changes and their server commit. */
export class CallRequestGuard {
  private version = 0

  capture() { return this.version }

  changed() { this.version += 1 }

  isCurrent(requestVersion: number) { return requestVersion === this.version }

  acknowledged(requestVersion: number) {
    const wasCurrent = this.isCurrent(requestVersion)
    // Even a poll begun after the optimistic change may have read the old DB
    // state. Its response becomes stale as soon as that change is committed.
    this.changed()
    return wasCurrent
  }

  protect<T extends { liveCalls?: AppState['liveCalls'] }>(
    snapshot: T, currentCalls: AppState['liveCalls'], requestVersion: number,
  ): T {
    return this.isCurrent(requestVersion) ? snapshot : { ...snapshot, liveCalls: currentCalls }
  }
}

/** Keep completed calls closed even when an older HTTP response arrives later. */
export function reconcileCallState(
  current: AppState,
  incoming: AppState,
  endedCallIds: ReadonlySet<string>,
  pendingStartIds: ReadonlySet<string>,
): AppState {
  const liveCalls = incoming.liveCalls.filter((call) => !endedCallIds.has(call.id))
  for (const call of current.liveCalls) {
    // Only an unacknowledged START may be missing from an otherwise valid pulse.
    if (pendingStartIds.has(call.id) && !endedCallIds.has(call.id) && !liveCalls.some((item) => item.id === call.id)) {
      liveCalls.push(call)
    }
  }
  return {
    ...incoming,
    liveCalls,
    activeCall: activeCallFromLive(incoming.currentUser?.id, liveCalls, current.activeCall),
  }
}
