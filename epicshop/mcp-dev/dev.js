#!/usr/bin/env node

import { createServer } from 'http'
import { randomBytes } from 'node:crypto'
import { styleText } from 'node:util'
import closeWithGrace from 'close-with-grace'
import { execa } from 'execa'
import getPort from 'get-port'
import httpProxy from 'http-proxy'

const { createProxyServer } = httpProxy

const [, , ...args] = process.argv
const [transport = 'streamable-http'] = args

const proxyPort = process.env.PORT || 3000
const inspectorServerPort = await getPort({
	port: Array.from({ length: 1000 }, (_, i) => i + 10000),
	exclude: [process.env.PORT].filter(Boolean).map(Number),
})
const inspectorClientPort = await getPort({
	port: Array.from({ length: 1000 }, (_, i) => i + 9000),
	exclude: [process.env.PORT, inspectorServerPort].filter(Boolean).map(Number),
})
const mcpServerPort = await getPort({
	port: Array.from({ length: 1000 }, (_, i) => i + 11000),
	exclude: [process.env.PORT, inspectorServerPort, inspectorClientPort]
		.filter(Boolean)
		.map(Number),
})

const sessionToken = randomBytes(32).toString('hex')

// Global process references
let devServerProcess = null
let inspectorProcess = null

/**
 * Start the dev server process
 */
function startDevServer() {
	if (transport !== 'streamable-http') return null

	console.log(
		styleText(
			'yellow',
			`🔍 Starting mcp dev server on port ${mcpServerPort}...`,
		),
	)

	devServerProcess = execa(
		'npm',
		['--silent', '--prefix', process.cwd(), 'run', 'dev:server'],
		{
			stdio: ['ignore', 'pipe', 'pipe'],
			env: { ...process.env, PORT: mcpServerPort },
		},
	)

	process.on('error', (err) => {
		console.error(
			styleText('red', '❌ Dev server failed to start:'),
			err.message,
		)
	})

	return devServerProcess
}

/**
 * Start the MCP inspector process
 */
function startInspector() {
	console.log(
		styleText(
			'yellow',
			`🔍 Starting MCP inspector on ports ${inspectorServerPort}/${inspectorClientPort}...`,
		),
	)

	inspectorProcess = execa('mcp-inspector', [], {
		env: {
			...process.env,
			SERVER_PORT: inspectorServerPort,
			CLIENT_PORT: inspectorClientPort,
			MCP_PROXY_AUTH_TOKEN: sessionToken,
			MCP_AUTO_OPEN_ENABLED: 'false',
			ALLOWED_ORIGINS: [
				`http://localhost:${inspectorClientPort}`,
				`http://127.0.0.1:${inspectorClientPort}`,
				`http://localhost:${proxyPort}`,
				`http://127.0.0.1:${proxyPort}`,
			].join(','),
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	})

	inspectorProcess.on('error', (err) => {
		console.error(
			styleText('red', '❌ Inspector failed to start:'),
			err.message,
		)
	})

	return inspectorProcess
}

/**
 * Wait for the dev server to be ready
 */
async function waitForServerReady({ process: childProcess, textMatch, name }) {
	if (!childProcess) return

	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			process.kill()
			reject(new Error(`${name} failed to start within 20 seconds`))
		}, 20_000)

		function searchForMatch(data) {
			const str = data.toString()
			if (str.includes(textMatch)) {
				clearTimeout(timeout)
				// Remove the listeners after finding the match
				childProcess.stdout.removeListener('data', searchForMatch)
				childProcess.stderr.removeListener('data', searchForMatch)
				resolve()
			}
		}
		childProcess.stdout.on('data', searchForMatch)
		childProcess.stderr.on('data', searchForMatch)

		childProcess.on('error', (err) => {
			clearTimeout(timeout)
			reject(err)
		})

		childProcess.on('exit', (code) => {
			if (code !== 0) {
				clearTimeout(timeout)
				reject(new Error(`${name} exited with code ${code}`))
			}
		})
	})
}

function pipeOutputToConsole({ process: childProcess, name, color }) {
	if (!childProcess) return

	childProcess.stdout.on('data', (data) => {
		const str = data.toString()
		process.stdout.write(styleText(color, `${name} `) + str)
	})

	childProcess.stderr.on('data', (data) => {
		const str = data.toString()
		process.stderr.write(styleText(color, `${name} `) + str)
	})
}

/**
 * Start both servers simultaneously
 */
async function startServers() {
	console.log(styleText('cyan', '🚀 Starting servers...'))

	// Start both servers at the same time
	const devServer = startDevServer()
	const inspector = startInspector()

	// Wait for both to be ready
	await Promise.all([
		waitForServerReady({
			process: devServer,
			textMatch: mcpServerPort.toString(),
			name: '[DEV-SERVER]',
		}),
		waitForServerReady({
			process: inspector,
			textMatch: inspectorClientPort.toString(),
			name: '[INSPECTOR]',
		}),
	])

	pipeOutputToConsole({
		process: devServer,
		name: '[DEV-SERVER]',
		color: 'blue',
	})
	pipeOutputToConsole({
		process: inspector,
		name: '[INSPECTOR]',
		color: 'magenta',
	})

	const servers = [devServer, inspector].filter(Boolean)

	console.log(
		styleText(
			'green',
			servers.length > 1 ? '✅ All servers ready!' : '✅ Server ready!',
		),
	)
}

/**
 * Create and configure the proxy server
 */
function createProxy() {
	const proxy = createProxyServer({
		target: `http://localhost:${inspectorClientPort}`,
		ws: true,
		changeOrigin: true,
	})

	const server = createServer((req, res) => {
		if (req.url === '/' || req.url.startsWith('/?')) {
			const url = new URL(req.url, `http://localhost:${inspectorClientPort}`)
			url.searchParams.set('transport', transport)

			if (transport === 'stdio') {
				const command = 'npm'
				const args = `--silent --prefix "${process.cwd()}" run dev:mcp`
				url.searchParams.set('serverCommand', command)
				url.searchParams.set('serverArgs', args)
			} else if (transport === 'streamable-http') {
				url.searchParams.set(
					'serverUrl',
					`http://localhost:${mcpServerPort}/mcp`,
				)
			}

			url.searchParams.set('MCP_PROXY_AUTH_TOKEN', sessionToken)
			url.searchParams.set(
				'MCP_PROXY_FULL_ADDRESS',
				`http://localhost:${inspectorServerPort}`,
			)
			url.searchParams.set('MCP_REQUEST_MAX_TOTAL_TIMEOUT', 1000 * 60 * 15)
			url.searchParams.set('MCP_SERVER_REQUEST_TIMEOUT', 1000 * 60 * 5)
			const correctedUrl = url.pathname + url.search
			if (correctedUrl !== req.url) {
				res.writeHead(302, { Location: correctedUrl })
				res.end()
				return
			}
		}
		proxy.web(req, res, {}, (err) => {
			res.writeHead(502, { 'Content-Type': 'text/plain' })
			res.end('Proxy error: ' + err.message)
		})
	})

	server.on('upgrade', (req, socket, head) => {
		proxy.ws(req, socket, head)
	})

	return { server, proxy }
}

/**
 * Start the proxy server and log information
 */
function startProxyServer(server) {
	server.listen(proxyPort, () => {
		// Enhanced, colorized logs
		const proxyUrl = `http://localhost:${proxyPort}`
		console.log(
			styleText('cyan', `🐨 Proxy server running: `) +
				styleText('green', proxyUrl),
		)
		console.log(
			styleText('gray', `- Inspector client port: `) +
				styleText('magenta', inspectorClientPort.toString()),
		)
		console.log(
			styleText('gray', `- Inspector server port: `) +
				styleText('yellow', inspectorServerPort.toString()),
		)
		if (transport === 'streamable-http') {
			console.log(
				styleText('gray', `- MCP server port: `) +
					styleText('yellow', mcpServerPort.toString()),
			)
		}
	})
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown({ proxy, server }) {
	const closeListeners = closeWithGrace(
		{ delay: 500 },
		async function ({ signal, err }) {
			if (err) console.error(err)

			if (inspectorProcess && !inspectorProcess.killed) {
				inspectorProcess.kill()
			}
			if (devServerProcess && !devServerProcess.killed) {
				devServerProcess.kill()
			}
			proxy.close()
			server.close(() => {
				console.log('HTTP server closed')
			})
		},
	)
}

// Main execution
async function main() {
	try {
		// Start both servers simultaneously
		await startServers()

		// Create and start proxy server
		const { server, proxy } = createProxy()
		startProxyServer(server)
		setupGracefulShutdown({ server, proxy })
	} catch (error) {
		devServerProcess?.kill()
		inspectorProcess?.kill()

		console.error('Failed to start servers:', error.message)
		process.exit(1)
	}
}

main()
