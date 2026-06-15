import { useRef, useState, useCallback } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

async function fetchClientToken() {
  const res = await fetch('/.netlify/functions/get-token', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to get client token')
  return res.json()
}

export function useDecartStory() {
  const rtClientRef = useRef(null)
  const imageCacheRef = useRef(new Map()) // url -> Blob, so set()'s re-send has no refetch
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [error, setError] = useState(null)

  // Fetch a reference image into a Blob (cached). set() isn't sticky, so we re-send
  // the bytes each call — caching avoids re-fetching from the network each time.
  const loadImageBlob = useCallback(async (url) => {
    const cache = imageCacheRef.current
    if (cache.has(url)) return cache.get(url)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to load reference image: ${url}`)
    const blob = await res.blob()
    cache.set(url, blob)
    return blob
  }, [])

  const preloadImages = useCallback(
    (urls) => Promise.all(urls.map((u) => loadImageBlob(u).catch((err) => {
      console.warn('[decart] preload failed', u, err)
    }))),
    [loadImageBlob]
  )

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

  // Atomic image + prompt update via set() — the Decart-recommended way to combine a
  // style reference with a text prompt. set() is NOT sticky, so every call re-sends
  // the image. Resolves only once the transform is applied (drives the mask).
  const setImagePrompt = useCallback(
    async (url, prompt) => {
      const client = rtClientRef.current
      if (!client) {
        console.warn('[decart] set called before client ready')
        return
      }
      try {
        const blob = await loadImageBlob(url)
        await client.set({ image: blob, prompt, enhance: true })
        console.log('[decart] set ok', { url, prompt })
      } catch (err) {
        console.error('[decart] set failed', err)
        setError(err.message || 'set failed')
      }
    },
    [loadImageBlob]
  )

  const disconnect = useCallback(() => {
    if (rtClientRef.current) {
      rtClientRef.current.disconnect()
      rtClientRef.current = null
    }
    setStatus('idle')
  }, [])

  return { connect, disconnect, setPrompt, setImagePrompt, preloadImages, status, error }
}
