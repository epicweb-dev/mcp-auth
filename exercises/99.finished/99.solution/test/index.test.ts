import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { test, expect, inject } from 'vitest'

const mcpServerPort = inject('mcpServerPort')
const EPIC_ME_SERVER_URL = 'http://localhost:7788'

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

test('OAuth integration flow works end-to-end', async () => {
	const mcpServerUrl = `http://localhost:${mcpServerPort}`

	// Step 0: Verify 401 response headers from initial unauthorized request
	const unauthorizedResponse = await fetch(`${mcpServerUrl}/mcp`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/list',
		}),
	})

	expect(unauthorizedResponse.status, '🚨 Expected 401 status for unauthorized request').toBe(401)
	
	const wwwAuthHeader = unauthorizedResponse.headers.get('WWW-Authenticate')
	expect(wwwAuthHeader, '🚨 WWW-Authenticate header should be present').toBeTruthy()
	expect(wwwAuthHeader, '🚨 WWW-Authenticate header should contain OAuth realm').toContain('OAuth realm="EpicMe"')
	expect(wwwAuthHeader, '🚨 WWW-Authenticate header should contain authorization_url').toContain('authorization_url=')
	
	// Extract the authorization URL from the header
	const authUrlMatch = wwwAuthHeader?.match(/authorization_url="([^"]+)"/)
	expect(authUrlMatch, '🚨 Could not extract authorization URL from WWW-Authenticate header').toBeTruthy()
	const authorizationUrl = authUrlMatch![1]

	// Step 1: Metadata discovery
	// Test OAuth Authorization Server discovery
	const authServerDiscoveryResponse = await fetch(`${mcpServerUrl}/.well-known/oauth-authorization-server`)
	expect(authServerDiscoveryResponse.ok, '🚨 OAuth authorization server discovery should succeed').toBe(true)
	
	const authServerConfig = await authServerDiscoveryResponse.json()
	expect(authServerConfig.authorization_endpoint, '🚨 Authorization endpoint should be present in discovery').toBeTruthy()
	expect(authServerConfig.token_endpoint, '🚨 Token endpoint should be present in discovery').toBeTruthy()

	// Test OAuth Protected Resource discovery
	const protectedResourceDiscoveryResponse = await fetch(`${mcpServerUrl}/.well-known/oauth-protected-resource/mcp`)
	expect(protectedResourceDiscoveryResponse.ok, '🚨 OAuth protected resource discovery should succeed').toBe(true)
	
	const protectedResourceConfig = await protectedResourceDiscoveryResponse.json()
	expect(protectedResourceConfig.resource, '🚨 Resource identifier should be present').toBe('epicme-mcp')
	expect(protectedResourceConfig.scopes, '🚨 Scopes should be present').toContain('read')
	expect(protectedResourceConfig.scopes, '🚨 Scopes should contain write').toContain('write')

	// Step 2: Dynamic client registration
	const clientRegistrationResponse = await fetch(`${EPIC_ME_SERVER_URL}/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_name: 'Test MCP Client',
			redirect_uris: [`${mcpServerUrl}/mcp`],
			scope: 'read write',
		}),
	})
	
	expect(clientRegistrationResponse.ok, '🚨 Client registration should succeed').toBe(true)
	const clientRegistration = await clientRegistrationResponse.json()
	expect(clientRegistration.client_id, '🚨 Client ID should be returned from registration').toBeTruthy()

	// Step 3: Preparing Authorization (getting the auth URL)
	const { codeVerifier, codeChallenge, codeChallengeMethod } = generateCodeChallenge()
	const state = crypto.randomUUID()
	const redirectUri = `${mcpServerUrl}/mcp`

	const authUrl = new URL(authorizationUrl)
	const originalParams = JSON.parse(authUrl.searchParams.get('oauth_req_info') || '{}')
	
	expect(originalParams.client_id, '🚨 Client ID should be present in auth URL').toBeTruthy()
	expect(originalParams.redirect_uri, '🚨 Redirect URI should be present in auth URL').toBeTruthy()
	expect(originalParams.response_type, '🚨 Response type should be code').toBe('code')

	// Step 4: Requesting the auth code programmatically
	const testAuthUrl = new URL(`${EPIC_ME_SERVER_URL}/test-auth`)
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
	
	const authResult = await authCodeResponse.json()
	expect(authResult.redirectTo, '🚨 Redirect URL should be returned').toBeTruthy()
	
	// Step 5: Supplying the auth code (extract from redirect URL)
	const redirectUrl = new URL(authResult.redirectTo)
	const authCode = redirectUrl.searchParams.get('code')
	const returnedState = redirectUrl.searchParams.get('state')
	
	expect(authCode, '🚨 Auth code should be present in redirect URL').toBeTruthy()
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
	
	const tokenResponse = await fetch(`${EPIC_ME_SERVER_URL}/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: tokenParams,
	})
	
	if (!tokenResponse.ok) {
		const errorText = await tokenResponse.text()
		console.error('Token exchange failed:', tokenResponse.status, errorText)
	}
	
	expect(tokenResponse.ok, '🚨 Token exchange should succeed').toBe(true)
	const tokenResult = await tokenResponse.json()
	expect(tokenResult.access_token, '🚨 Access token should be returned').toBeTruthy()
	expect(tokenResult.token_type?.toLowerCase(), '🚨 Token type should be Bearer').toBe('bearer')

	// Step 7: Performing authenticated requests (listing tools)
	// Verify the token works by making a simple authenticated request to the MCP server
	// We'll test that we get past the authentication (no 401) even if we get protocol errors
	const authTestResponse = await fetch(`${mcpServerUrl}/mcp`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json, text/event-stream',
			Authorization: `Bearer ${tokenResult.access_token}`,
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
	
	expect(authTestResponse.status, '🚨 Should not get 401 Unauthorized with valid token').not.toBe(401)
})
