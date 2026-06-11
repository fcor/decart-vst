import { createDecartClient } from '@decartai/sdk'

const serverClient = createDecartClient({
  apiKey: process.env.DECART_API_KEY,
})

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const token = await serverClient.tokens.create({
      expiresIn: 300,
      allowedModels: ['lucy-restyle-2'],
      allowedOrigins: [process.env.ALLOWED_ORIGIN || 'http://localhost:5173'],
      constraints: {
        realtime: { maxSessionDuration: 300 },
      },
    })

    return new Response(JSON.stringify({ apiKey: token.apiKey, expiresAt: token.expiresAt }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to create token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
