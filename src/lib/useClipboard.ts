import { useCallback, useEffect, useRef, useState } from 'react'
import copy from 'clipboard-copy'

export function useClipboard(text: string) {
  const [feedback, setFeedback] = useState<{
    text: string
    status: 'copied' | 'error'
  } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const request = useRef(0)

  const reset = useCallback(() => {
    request.current += 1
    clearTimeout(timer.current)
    setFeedback(null)
  }, [])

  useEffect(
    () => () => {
      request.current += 1
      clearTimeout(timer.current)
    },
    [text]
  )

  const doCopy = async () => {
    if (!text) return
    const id = ++request.current
    clearTimeout(timer.current)
    try {
      await copy(text)
      if (id !== request.current) return
      setFeedback({ text, status: 'copied' })
      timer.current = setTimeout(() => setFeedback(null), 1500)
    } catch {
      if (id === request.current) setFeedback({ text, status: 'error' })
    }
  }

  const status = feedback?.text === text ? feedback.status : 'idle'
  return {
    copied: status === 'copied',
    error: status === 'error',
    doCopy,
    reset
  }
}
