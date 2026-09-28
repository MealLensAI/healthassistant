import { createContext, useContext } from 'react'

export type CallChrome = 'expanded' | 'minimized'

export type CallMediaValue = {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  mediaError: string | null
  muted: boolean
  cameraOff: boolean
  remoteCameraOff: boolean
  setMuted: (value: boolean) => void
  setCameraOff: (value: boolean) => void
  ensureLocalMedia: () => Promise<MediaStream | null>
  runWithLocalMedia: (action: () => void | Promise<unknown>) => Promise<void>
  preparingCall: boolean
  devices: MediaDeviceInfo[]
  selectDevice: (kind: 'audioinput' | 'videoinput', deviceId: string) => Promise<void>
  ringtoneBlocked: boolean
  enableCallSounds: () => void
  playbackBlocked: boolean
  playRemoteAudio: () => void
  callChrome: CallChrome
  setCallChrome: (value: CallChrome) => void
}

// Keep context identity outside the React Refresh provider module. All call
// controls must consume the same instance, including after a provider hot reload.
export const CallMediaContext = createContext<CallMediaValue | null>(null)

export function useCallMedia() {
  const media = useContext(CallMediaContext)
  if (!media) throw new Error('useCallMedia must be used within CallMediaProvider')
  return media
}
