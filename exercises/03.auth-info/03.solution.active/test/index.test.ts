import { test, expect, inject } from 'vitest'

const mcpServerPort = inject('mcpServerPort')
const mcpServerUrl = `http://localhost:${mcpServerPort}`

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

test(`MCP server provides specific error messages for invalid tokens`, async () => {
	// Test that when a request has an authorization header, the server returns
	// specific error information in the WWW-Authenticate header (step 2 functionality)

	// Test 1: Request WITHOUT authorization header (should NOT include error parameters)
	const noAuthResponse = await makeInitRequest()
	expect(noAuthResponse.status).toBe(401)

	const noAuthHeader = noAuthResponse.headers.get('WWW-Authenticate')
	expect(noAuthHeader).not.toContain('error=')
	expect(noAuthHeader).not.toContain('error_description=')

	// Test 2: Request WITH authorization header (should include error parameters)
	// We'll use a malformed JSON body to trigger handleUnauthorized without hitting the ZodError
	const responseWithAuth = await fetch(`${mcpServerUrl}/mcp`, {
		method: 'POST',
		headers: {
			authorization: 'Bearer invalid-token',
			'content-type': 'application/json',
		},
		body: 'invalid-json',
	})

	expect(responseWithAuth.status).toBe(401)
	const headerWithAuth = responseWithAuth.headers.get('WWW-Authenticate')
	expect(headerWithAuth).toContain('error="invalid_token"')
	expect(headerWithAuth).toContain(
		'error_description="The access token is invalid or expired"',
	)
})

test(`MCP server provides generic error messages for missing authorization header`, async () => {
	// Test that when a request has no authorization header,
	// the server returns a 401 with generic error information (no error parameter)

	// Make an initialization request without any authorization header
	const mcpResponse = await makeInitRequest()

	expect(
		mcpResponse.status,
		'🚨 MCP server should return 401 for requests without authorization',
	).toBe(401)

	// Check that the WWW-Authenticate header does NOT include specific error information
	const wwwAuthenticate = mcpResponse.headers.get('WWW-Authenticate')
	expect(
		wwwAuthenticate,
		'🚨 Response should include WWW-Authenticate header',
	).toBeTruthy()

	// Should NOT include error parameter when no authorization header is present
	expect(
		wwwAuthenticate,
		'🚨 WWW-Authenticate should NOT include error parameter when no auth header',
	).not.toContain('error=')

	// Should NOT include error_description when no authorization header is present
	expect(
		wwwAuthenticate,
		'🚨 WWW-Authenticate should NOT include error_description when no auth header',
	).not.toContain('error_description=')

	// Should still include the realm and resource_metadata
	expect(
		wwwAuthenticate,
		'🚨 WWW-Authenticate should include Bearer realm',
	).toContain('Bearer realm="EpicMe"')
	expect(
		wwwAuthenticate,
		'🚨 WWW-Authenticate should include resource_metadata',
	).toContain('resource_metadata=')
})
