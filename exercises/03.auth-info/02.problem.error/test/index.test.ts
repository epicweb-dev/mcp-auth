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

test(`MCP server introspects tokens before processing requests`, async () => {
	// Test that the MCP server attempts to introspect tokens and validates them
	// The solution should introspect the token and fail when the token is invalid
	// The problem version only checks if the authorization header exists
	const testToken = '1:1:test-token-id'

	// Make an initialization request to the MCP server with an invalid token
	const mcpResponse = await makeInitRequest(testToken)

	// The solution implementation should reject invalid tokens after introspection
	// The current solution throws a ZodError when parsing invalid introspection response, resulting in 500
	// The problem version would accept any token and let the MCP server handle it (returning 200)
	expect(
		mcpResponse.status,
		'🚨 Solution should reject invalid tokens after introspection',
	).toBe(500)

	// Verify that the server attempted introspection by checking the error response
	const responseText = await mcpResponse.text()
	expect(
		responseText,
		'🚨 Should get an error response indicating introspection failure',
	).toContain('ZodError')
})

test(`MCP server rejects requests without authorization header`, async () => {
	// Make an initialization request without any authorization header
	const mcpResponse = await makeInitRequest()

	expect(
		mcpResponse.status,
		'🚨 MCP server should return 401 for requests without authorization',
	).toBe(401)

	const wwwAuthenticate = mcpResponse.headers.get('WWW-Authenticate')
	expect(
		wwwAuthenticate,
		'🚨 Response should include WWW-Authenticate header',
	).toBeTruthy()
	expect(
		wwwAuthenticate,
		'🚨 WWW-Authenticate should include Bearer realm',
	).toContain('Bearer realm="EpicMe"')
})
