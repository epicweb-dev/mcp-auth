import { invariant } from '@epic-web/invariant'
import {
	type JSONRPCMessage,
	JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { test, expect, inject } from 'vitest'

const mcpServerPort = inject('mcpServerPort')
const EPIC_ME_AUTH_SERVER_URL = 'http://localhost:7788'
const mcpServerUrl = `http://localhost:${mcpServerPort}`

test(`tools can be called with a valid token`, async () => {
	const tokenResult = await getAuthToken()
	const response = await initialize(tokenResult.access_token)
	const sessionId = response.headers.get('mcp-session-id')
	invariant(
		sessionId,
		'🚨 initialization response should have an MCP session ID header',
	)
	const toolResponse = await fetch(`${mcpServerUrl}/mcp`, {
		method: 'POST',
		headers: {
			'mcp-session-id': sessionId,
			accept: 'application/json, text/event-stream',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${tokenResult.access_token}`,
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: crypto.randomUUID(),
			method: 'tools/call',
			params: {
				name: 'whoami',
				arguments: {},
			},
		}),
	})
	const toolResponseData = await handleStreamableResponse(toolResponse)
	expect(
		toolResponseData,
		'🚨 the whoami tool should be return the user info',
	).toEqual([
		{
			id: expect.any(String),
			jsonrpc: '2.0',
			result: expect.objectContaining({
				structuredContent: {
					user: {
						createdAt: expect.any(Number),
						email: expect.any(String),
						id: expect.any(Number),
						updatedAt: expect.any(Number),
					},
				},
			}),
		},
	])
})

async function getAuthToken() {
	const redirectUri = `https://example.com/test-mcp-client`
	const clientRegistrationResponse = await fetch(
		`${EPIC_ME_AUTH_SERVER_URL}/oauth/register`,
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
			},
			body: JSON.stringify({
				client_name: 'Test MCP Client',
				redirect_uris: [redirectUri],
			}),
		},
	)

	expect(
		clientRegistrationResponse.ok,
		'🚨 Client registration should succeed',
	).toBe(true)
	const clientRegistration =
		(await clientRegistrationResponse.json()) as ClientRegistration
	expect(
		clientRegistration.client_id,
		'🚨 Client ID should be returned from registration',
	).toBeTruthy()

	const { codeVerifier, codeChallenge, codeChallengeMethod } =
		generateCodeChallenge()
	const state = crypto.randomUUID()

	const testAuthUrl = new URL(`${EPIC_ME_AUTH_SERVER_URL}/test-auth`)
	// Use the registered client ID instead of the one from the auth URL
	testAuthUrl.searchParams.set('client_id', clientRegistration.client_id)
	testAuthUrl.searchParams.set('redirect_uri', redirectUri)
	testAuthUrl.searchParams.set('response_type', 'code')
	testAuthUrl.searchParams.set('code_challenge', codeChallenge)
	testAuthUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
	testAuthUrl.searchParams.set('scope', '')
	testAuthUrl.searchParams.set('state', state)

	const authCodeResponse = await fetch(testAuthUrl.toString())
	expect(authCodeResponse.ok, '🚨 Auth code request should succeed').toBe(true)

	const authResult = (await authCodeResponse.json()) as AuthResult
	expect(
		authResult.redirectTo,
		'🚨 Redirect URL should be returned',
	).toBeTruthy()

	const redirectUrl = new URL(authResult.redirectTo)
	const authCode = redirectUrl.searchParams.get('code')
	const returnedState = redirectUrl.searchParams.get('state')

	expect(
		authCode,
		'🚨 Auth code should be present in redirect URL',
	).toBeTruthy()
	expect(returnedState, '🚨 State should be returned').toBe(state)

	const tokenParams = new URLSearchParams({
		grant_type: 'authorization_code',
		code: authCode!,
		redirect_uri: redirectUri,
		client_id: clientRegistration.client_id, // Use registered client ID
		code_verifier: codeVerifier,
	})

	// Add client_secret if provided during registration
	if (clientRegistration.client_secret) {
		tokenParams.set('client_secret', clientRegistration.client_secret)
	}

	const tokenResponse = await fetch(`${EPIC_ME_AUTH_SERVER_URL}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: tokenParams,
	})

	if (!tokenResponse.ok) {
		const errorText = await tokenResponse.text()
		console.error('Token exchange failed:', tokenResponse.status, errorText)
	}

	expect(tokenResponse.ok, '🚨 Token exchange should succeed').toBe(true)
	const tokenResult = (await tokenResponse.json()) as TokenResult
	expect(
		tokenResult.access_token,
		'🚨 Access token should be returned',
	).toBeTruthy()
	expect(
		tokenResult.token_type?.toLowerCase(),
		'🚨 Token type should be Bearer',
	).toBe('bearer')

	return tokenResult
}

async function initialize(accessToken: string) {
	const authTestResponse = await fetch(`${mcpServerUrl}/mcp`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json, text/event-stream',
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: crypto.randomUUID(),
			method: 'initialize',
			params: {
				protocolVersion: '2024-11-05',
				capabilities: {},
				clientInfo: {
					name: 'Test Client',
					version: '1.0.0',
				},
			},
		}),
	})

	expect(
		authTestResponse.status,
		'🚨 Should not get 401 Unauthorized with valid token',
	).not.toBe(401)
	return authTestResponse
}

async function handleStreamableResponse(response: Response) {
	if (response.headers.get('content-type')?.includes('text/event-stream')) {
		const stream = response.body
		if (!stream) {
			throw new Error('No response body available for streaming')
		}

		const messages: Array<JSONRPCMessage> = []

		try {
			// Create a pipeline: binary stream -> text decoder
			const reader = stream.pipeThrough(new TextDecoderStream()).getReader()

			let buffer = ''
			let messageReceived = false

			while (true) {
				const { value: chunk, done } = await reader.read()
				if (done) {
					break
				}

				buffer += chunk

				// Process complete SSE messages
				const lines = buffer.split('\n')
				buffer = lines.pop() || '' // Keep incomplete line in buffer

				let eventData = ''
				let inData = false

				for (const line of lines) {
					if (line.trim() === '') {
						// Empty line indicates end of event
						if (eventData && inData) {
							try {
								const message = JSONRPCMessageSchema.parse(
									JSON.parse(eventData),
								)
								messages.push(message)
								messageReceived = true

								// Close the connection after receiving the first message
								// to prevent hanging if the server doesn't close the stream
								void reader.cancel().catch(() => {})
								break
							} catch (error) {
								console.error('Failed to parse SSE message:', error)
								// Continue processing other messages even if one fails
							}
						}
						eventData = ''
						inData = false
					} else if (line.startsWith('data: ')) {
						eventData += line.slice(6) // Remove 'data: ' prefix
						inData = true
					}
					// Ignore other SSE fields like 'event:', 'id:', etc.
				}

				// Break out of the main loop if we've received a message and cancelled
				if (messageReceived) {
					break
				}
			}
		} catch (error) {
			console.error('SSE stream error:', error)
			throw new Error(`SSE stream disconnected: ${error}`)
		}

		return messages
	} else {
		return response.json()
	}
}

// TypeScript interfaces for API responses
interface AuthServerConfig {
	authorization_endpoint: string
	token_endpoint: string
	[key: string]: unknown
}

interface ClientRegistration {
	client_id: string
	client_secret?: string
	[key: string]: unknown
}

interface AuthResult {
	redirectTo: string
	[key: string]: unknown
}

interface TokenResult {
	access_token: string
	token_type: string
	[key: string]: unknown
}

// Helper function to generate PKCE challenge
function generateCodeChallenge() {
	const codeVerifier = btoa(
		String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
	)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '')

	return {
		codeVerifier,
		codeChallenge: codeVerifier, // For simplicity, using plain method
		codeChallengeMethod: 'plain',
	}
}
