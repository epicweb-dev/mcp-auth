import { test, expect, inject } from 'vitest'

const mcpServerPort = inject('mcpServerPort')
const mcpServerUrl = `http://localhost:${mcpServerPort}`

test(`WWW-Authenticate header includes auth params when authorization is missing`, async () => {
	const response = await fetch(`${mcpServerUrl}/mcp`)

	expect(
		response.status,
		'🚨 Request without Authorization header should return 401 status',
	).toBe(401)

	const wwwAuthenticateHeader = response.headers.get('WWW-Authenticate')
	expect(
		wwwAuthenticateHeader,
		'🚨 Response should include WWW-Authenticate header',
	).toBeTruthy()

	expect(
		wwwAuthenticateHeader?.includes('Bearer'),
		'🚨 WWW-Authenticate header should include Bearer scheme',
	).toBe(true)

	expect(
		wwwAuthenticateHeader?.includes('realm="EpicMe"'),
		'🚨 WWW-Authenticate header should include realm="EpicMe"',
	).toBe(true)

	expect(
		wwwAuthenticateHeader?.includes('resource_metadata='),
		'🚨 WWW-Authenticate header should include resource_metadata parameter',
	).toBe(true)

	// Extract the resource_metadata URL from the header
	const resourceMetadataMatch = wwwAuthenticateHeader?.match(
		/resource_metadata="([^"]+)"/,
	)
	expect(
		resourceMetadataMatch,
		'🚨 Should be able to extract resource_metadata URL from WWW-Authenticate header',
	).toBeTruthy()

	const resourceMetadataUrl = resourceMetadataMatch?.[1]
	expect(
		resourceMetadataUrl,
		'🚨 resource_metadata URL should not be empty',
	).toBeTruthy()

	// Verify the resource_metadata URL points to the correct endpoint
	const expectedResourceMetadataUrl = `${mcpServerUrl}/.well-known/oauth-protected-resource/mcp`
	expect(
		resourceMetadataUrl,
		`🚨 resource_metadata should point to ${expectedResourceMetadataUrl}`,
	).toBe(expectedResourceMetadataUrl)
})
