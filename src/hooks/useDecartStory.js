import { useRef, useState, useCallback } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

async function fetchClientToken() {
  const res = await fetch('/.netlify/functions/get-token', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to get client token')
  return res.json()
}

export function useDecartStory() {
  const rtClientRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [error, setError] = useState(null)

  const connect = useCallback(async (localStream, outputVideoEl, modelId, initialPrompt) => {
    setStatus('connecting')
    setError(null)

    try {
      const { apiKey } = await fetchClientToken()
      const client = createDecartClient({ apiKey })

      const rtClient = await client.realtime.connect(localStream, {
        model: models.realtime(modelId),
        // Apply the first prompt during connection setup so the opening look is
        // already rendering when the story starts (avoids a cold first beat /
        // raw-camera flash). Recommended by the Decart docs.
        ...(initialPrompt ? { initialState: { prompt: { text: initialPrompt } } } : {}),
        onRemoteStream: (remoteStream) => {
          outputVideoEl.srcObject = remoteStream
          setStatus('connected')
        },
        onError: (err) => {
          setError(err.message || 'Connection error')
          setStatus('error')
        },
        onDisconnect: () => {
          setStatus('idle')
        },
      })

      rtClientRef.current = rtClient
    } catch (err) {
      setError(err.message || 'Failed to connect')
      setStatus('error')
    }
  }, [])

  const setPrompt = useCallback(async (prompt) => {
    const client = rtClientRef.current
    if (!client) {
      console.warn('[decart] setPrompt called before client ready')
      return
    }
    try {
      await client.setPrompt(prompt)
      console.log('[decart] setPrompt ok', { prompt })
    } catch (err) {
      console.error('[decart] setPrompt failed', err)
      setError(err.message || 'setPrompt failed')
    }
  }, [])

  const disconnect = useCallback(() => {
    if (rtClientRef.current) {
      rtClientRef.current.disconnect()
      rtClientRef.current = null
    }
    setStatus('idle')
  }, [])

  return { connect, disconnect, setPrompt, status, error }
}
