import { useCallback, useEffect, useRef, useState } from 'react'
import { stripMarkdown } from '../lib/stripMarkdown'

export function useVoiceOutput() {
  const [enabled, setEnabled] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Pick the best available English voice
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices()
    return (
      voices.find((v) => v.name === 'Google US English') ??
      voices.find((v) => v.lang === 'en-US' && v.localService) ??
      voices.find((v) => v.lang.startsWith('en')) ??
      null
    )
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!enabled) return
      window.speechSynthesis.cancel()

      const clean = stripMarkdown(text)
      if (!clean.trim()) return

      const utterance = new SpeechSynthesisUtterance(clean)
      utterance.rate = 1.1
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const voice = getVoice()
      if (voice) utterance.voice = voice

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [enabled, getVoice]
  )

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const toggle = useCallback(() => {
    setEnabled((v) => {
      if (v) window.speechSynthesis.cancel()
      return !v
    })
  }, [])

  // Stop speaking when disabled
  useEffect(() => {
    if (!enabled) window.speechSynthesis.cancel()
  }, [enabled])

  // Clean up on unmount
  useEffect(() => {
    return () => window.speechSynthesis.cancel()
  }, [])

  return { enabled, speaking, speak, stop, toggle }
}
