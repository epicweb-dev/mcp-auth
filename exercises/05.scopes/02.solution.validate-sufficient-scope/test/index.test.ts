import { test, expect, inject } from 'vitest'

const mcpServerPort = inject('mcpServerPort')
const EPIC_ME_AUTH_SERVER_URL = 'http://localhost:7788'
const mcpServerUrl = `http://localhost:${mcpServerPort}`

test(`initialize request returns a 403 forbidden if the user has insufficient scopes with helpful error message`, async () => {
	const tokenResult = await getAuthToken({ scopes: [] })
	const response = await initialize(tokenResult.access_token)
	expect(
		response.status,
		'🚨 initialize request should return a 403 forbidden',
	).toBe(403)
	expect(
		response.headers.get('WWW-Authenticate'),
		'🚨 WWW-Authenticate header should be present',
	).toBeTruthy()
	expect(
		response.headers.get('WWW-Authenticate'),
		'🚨 WWW-Authenticate header should contain Bearer realm',
	).toContain('Bearer realm="EpicMe"')
	expect(
		response.headers.get('WWW-Authenticate'),
		'🚨 WWW-Authenticate header should contain error',
	).toContain('error="insufficient_scope"')
	expect(
		response.headers.get('WWW-Authenticate'),
		'🚨 WWW-Authenticate header should contain error_description',
	).toContain('error_description=')
	const validScopeCombinations = [
		['user:read'],
		['entries:read'],
		['entries:write'],
		['tags:read'],
		['tags:write'],
	]
	for (const scopeCombo of validScopeCombinations) {
		expect(
			response.headers.get('WWW-Authenticate'),
			'🚨 WWW-Authenticate header should contain error_description',
		).toContain(scopeCombo.join(' '))
	}
})

type Scopes =
	| 'user:read'
	| 'user:write'
	| 'entries:read'
	| 'entries:write'
	| 'tags:read'
	| 'tags:write'
async function getAuthToken({ scopes }: { scopes: Array<Scopes> }) {
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
	testAuthUrl.searchParams.set('client_id', clientRegistration.client_id)
	testAuthUrl.searchParams.set('redirect_uri', redirectUri)
	testAuthUrl.searchParams.set('response_type', 'code')
	testAuthUrl.searchParams.set('code_challenge', codeChallenge)
	testAuthUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
	testAuthUrl.searchParams.set('scope', scopes.join(' '))
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

	return authTestResponse
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
