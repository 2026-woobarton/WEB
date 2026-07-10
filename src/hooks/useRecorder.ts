import { useCallback, useRef, useState } from 'react'

export interface Recorder {
  supported: boolean
  recording: boolean
  start: () => Promise<void>
  /** 녹음을 멈추고 오디오 Blob 을 반환. 녹음이 없으면 null */
  stop: () => Promise<Blob | null>
}

/**
 * MediaRecorder 기반 마이크 녹음 훅.
 * stop() 이 완성된 오디오 Blob 을 resolve 하므로, 그 Blob 을 Whisper 로 넘기면 됩니다.
 */
export function useRecorder(): Recorder {
  const [recording, setRecording] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof window !== 'undefined' &&
    'MediaRecorder' in window

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    chunksRef.current = []
    const mime = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : ''
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    mediaRef.current = mr
    mr.start()
    setRecording(true)
  }, [])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mr = mediaRef.current
      if (!mr) {
        resolve(null)
        return
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || 'audio/webm',
        })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        mediaRef.current = null
        setRecording(false)
        resolve(blob.size > 0 ? blob : null)
      }
      mr.stop()
    })
  }, [])

  return { supported, recording, start, stop }
}
