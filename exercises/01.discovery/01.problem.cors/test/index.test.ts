import { test, expect, inject } from 'vitest'

const mcpServerPort = inject('mcpServerPort')
const mcpServerUrl = `http://localhost:${mcpServerPort}`

test(`The CORS headers are set correctly for /.well-known/oauth-authorization-server`, async () => {
	const resourceMetadataResponse = await fetch(
		`${mcpServerUrl}/.well-known/oauth-authorization-server`,
	)
	expect(
		resourceMetadataResponse.ok,
		'🚨 fetching authorization server metadata should succeed',
	).toBe(false)
	expect(
		resourceMetadataResponse.status,
		`🚨 fetching authorization server metadata should fail (we haven't implemented the endpoint yet)`,
	).toBe(404)
	expect(
		resourceMetadataResponse.headers.get('Access-Control-Allow-Origin'),
		'🚨 Access-Control-Allow-Origin header should be set',
	).toBe('*')
	expect(
		resourceMetadataResponse.headers.get('Access-Control-Allow-Methods'),
		'🚨 Access-Control-Allow-Methods header should be set',
	).toBe('GET, HEAD, OPTIONS')
	expect(
		resourceMetadataResponse.headers.get('Access-Control-Allow-Headers'),
		'🚨 Access-Control-Allow-Headers header should be set',
	).toBe('mcp-protocol-version')
})
