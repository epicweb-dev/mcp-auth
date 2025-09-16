import { test, expect, inject } from 'vitest'

const mcpServerPort = inject('mcpServerPort')
const mcpServerUrl = `http://localhost:${mcpServerPort}`

test(`Missing Authorization header returns 401 with WWW-Authenticate`, async () => {
	const response = await fetch(`${mcpServerUrl}/mcp`)

	expect(
		response.status,
		'🚨 Request without Authorization header should return 401 Unauthorized',
	).toBe(401)

	const wwwAuthenticate = response.headers.get('WWW-Authenticate')
	expect(
		wwwAuthenticate,
		'🚨 401 response should include WWW-Authenticate header',
	).toBeTruthy()

	expect(
		wwwAuthenticate,
		'🚨 WWW-Authenticate header should specify Bearer realm="EpicMe"',
	).toBe('Bearer realm="EpicMe"')
})
