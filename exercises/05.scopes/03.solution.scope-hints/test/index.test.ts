import { test, expect, inject } from 'vitest'
import { z } from 'zod'

const mcpServerPort = inject('mcpServerPort')
const EPIC_ME_AUTH_SERVER_URL = 'http://localhost:7788'
const mcpServerUrl = `http://localhost:${mcpServerPort}`

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

async function makeInitRequest(accessToken?: string) {
	const response = await fetch(`${mcpServerUrl}/mcp`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
			...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
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

	return response
}

test('OAuth integration flow works end-to-end', async () => {
	// Step 0: Verify 401 response headers from initial unauthorized request
	const unauthorizedResponse = await makeInitRequest()

	expect(
		unauthorizedResponse.status,
		'🚨 Expected 401 status for unauthorized request',
	).toBe(401)

	const wwwAuthHeader = unauthorizedResponse.headers.get('WWW-Authenticate')
	expect(
		wwwAuthHeader,
		'🚨 WWW-Authenticate header should be present',
	).toBeTruthy()
	expect(
		wwwAuthHeader,
		'🚨 WWW-Authenticate header should contain Bearer realm',
	).toContain('Bearer realm="EpicMe"')

	// Extract the resource_metadata url from the WWW-Authenticate header
	const resourceMetadataUrl = wwwAuthHeader
		?.split(',')
		.find((h) => h.includes('resource_metadata='))
		?.split('=')[1]

	expect(
		resourceMetadataUrl,
		'🚨 Resource metadata URL should be present in WWW-Authenticate header',
	).toBeTruthy()

	const resourceMetadataResponse = await fetch(resourceMetadataUrl!)
	expect(
		resourceMetadataResponse.ok,
		'🚨 fetching resource metadata should succeed',
	).toBe(true)

	const resourceMetadataResult = z
		.object({
			resource: z.string(),
			authorization_servers: z.array(z.string()).length(1),
			scopes_supported: z.array(z.string()),
		})
		.safeParse(await resourceMetadataResponse.json())
	if (!resourceMetadataResult.success) {
		throw new Error(
			'🚨 Invalid resource metadata: ' + resourceMetadataResult.error.message,
		)
	}
	const resourceMetadata = resourceMetadataResult.data

	const authorizationUrl = resourceMetadata.authorization_servers[0]!

	// Step 1: Metadata discovery
	// Test OAuth Authorization Server discovery
	const authServerDiscoveryResponse = await fetch(
		`${authorizationUrl}/.well-known/oauth-authorization-server`,
	)
	expect(
		authServerDiscoveryResponse.ok,
		'🚨 OAuth authorization server discovery should succeed',
	).toBe(true)

	const authServerConfig =
		(await authServerDiscoveryResponse.json()) as AuthServerConfig
	expect(
		authServerConfig.authorization_endpoint,
		'🚨 Authorization endpoint should be present in discovery',
	).toBeTruthy()
	expect(
		authServerConfig.token_endpoint,
		'🚨 Token endpoint should be present in discovery',
	).toBeTruthy()

	// Step 2: Dynamic client registration
	const clientRegistrationResponse = await fetch(
		`${EPIC_ME_AUTH_SERVER_URL}/register`,
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
			},
			body: JSON.stringify({
				client_name: 'Test MCP Client',
				redirect_uris: [`${mcpServerUrl}/mcp`],
				scope: 'read write',
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

	// Step 3: Preparing Authorization (getting the auth URL)
	const { codeVerifier, codeChallenge, codeChallengeMethod } =
		generateCodeChallenge()
	const state = crypto.randomUUID()
	const redirectUri = `${mcpServerUrl}/mcp`

	// Step 4: Requesting the auth code programmatically
	const testAuthUrl = new URL(`${EPIC_ME_AUTH_SERVER_URL}/test-auth`)
	// Use the registered client ID instead of the one from the auth URL
	testAuthUrl.searchParams.set('client_id', clientRegistration.client_id)
	testAuthUrl.searchParams.set('redirect_uri', redirectUri)
	testAuthUrl.searchParams.set('response_type', 'code')
	testAuthUrl.searchParams.set('code_challenge', codeChallenge)
	testAuthUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
	testAuthUrl.searchParams.set('scope', 'read write')
	testAuthUrl.searchParams.set('state', state)

	const authCodeResponse = await fetch(testAuthUrl.toString())
	expect(authCodeResponse.ok, '🚨 Auth code request should succeed').toBe(true)

	const authResult = (await authCodeResponse.json()) as AuthResult
	expect(
		authResult.redirectTo,
		'🚨 Redirect URL should be returned',
	).toBeTruthy()

	// Step 5: Supplying the auth code (extract from redirect URL)
	const redirectUrl = new URL(authResult.redirectTo)
	const authCode = redirectUrl.searchParams.get('code')
	const returnedState = redirectUrl.searchParams.get('state')

	expect(
		authCode,
		'🚨 Auth code should be present in redirect URL',
	).toBeTruthy()
	expect(returnedState, '🚨 State should be returned').toBe(state)

	// Step 6: Requesting the token
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

	const tokenResponse = await fetch(`${EPIC_ME_AUTH_SERVER_URL}/token`, {
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

	// Step 7: Performing authenticated requests (listing tools)
	// Verify the token works by making a simple authenticated request to the MCP server
	// We'll test that we get past the authentication (no 401) even if we get protocol errors
	const authTestResponse = await makeInitRequest(tokenResult.access_token)

	expect(
		authTestResponse.status,
		'🚨 Should not get 401 Unauthorized with valid token',
	).not.toBe(401)
})
