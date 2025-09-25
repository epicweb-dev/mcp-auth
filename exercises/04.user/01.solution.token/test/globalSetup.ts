import { execa } from 'execa'
import getPort from 'get-port'
import { type TestProject } from 'vitest/node'

declare module 'vitest' {
	export interface ProvidedContext {
		mcpServerPort: number
	}
}

type OutputBuffer = Array<{ channel: 'stdout' | 'stderr'; data: Buffer }>

export default async function setup(project: TestProject) {
	const mcpServerPort = await getPort()

	project.provide('mcpServerPort', mcpServerPort)

	let appServerProcess: ReturnType<typeof execa> | null = null
	let mcpServerProcess: ReturnType<typeof execa> | null = null

	// Buffers to store output for potential error display
	const appServerOutput: OutputBuffer = []
	const mcpServerOutput: OutputBuffer = []

	/**
	 * Wait for a server to be ready by monitoring its output for a specific text pattern
	 */
	async function waitForServerReady({
		process: childProcess,
		textMatch,
		name,
		outputBuffer,
	}: {
		process: ReturnType<typeof execa> | null
		textMatch: string
		name: string
		outputBuffer: OutputBuffer
	}) {
		if (!childProcess) return

		return new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				childProcess?.kill()
				reject(new Error(`${name} failed to start within 10 seconds`))
			}, 10_000)

			function searchForMatch(
				channel: OutputBuffer[number]['channel'],
				data: Buffer,
			) {
				outputBuffer.push({ channel, data })
				const str = data.toString()
				if (str.includes(textMatch)) {
					clearTimeout(timeout)
					// Remove the listeners after finding the match
					childProcess?.stdout?.removeListener('data', searchForMatch)
					childProcess?.stderr?.removeListener('data', searchForMatch)
					resolve()
				}
			}

			childProcess?.stdout?.on('data', searchForMatch.bind(null, 'stdout'))
			childProcess?.stderr?.on('data', searchForMatch.bind(null, 'stderr'))

			childProcess?.on('error', (err) => {
				clearTimeout(timeout)
				reject(err)
			})

			childProcess?.on('exit', (code) => {
				if (code !== 0) {
					clearTimeout(timeout)
					reject(new Error(`${name} exited with code ${code}`))
				}
			})
		})
	}

	/**
	 * Display buffered output when there's a failure
	 */
	function displayBufferedOutput() {
		if (appServerOutput.length > 0) {
			console.log('=== App Server Output ===')
			for (const { channel, data } of appServerOutput) {
				process[channel].write(data)
			}
		}
		if (mcpServerOutput.length > 0) {
			console.log('=== MCP Server Output ===')
			for (const { channel, data } of mcpServerOutput) {
				process[channel].write(data)
			}
		}
	}

	async function startAppServerIfNecessary() {
		const isAppRunning = await fetch('http://localhost:7788/healthcheck').catch(
			() => ({ ok: false }),
		)
		if (isAppRunning.ok) {
			return
		}

		const rootDir = process.cwd().replace(/exercises\/.*$/, '')

		// Start the app server from the root directory
		console.log(`Starting app server on port 7788...`)
		const command = 'npm'
		// prettier-ignore
		const args = [
			'run', 'dev',
			'--prefix', './epicshop/epic-me',
			'--',
			'--clearScreen=false',
			'--strictPort',
		]

		appServerProcess = execa(command, args, {
			cwd: rootDir,
			stdio: ['ignore', 'pipe', 'pipe'],
		})
	}

	async function startServers() {
		console.log('Starting servers...')

		// Start app server if necessary
		await startAppServerIfNecessary()

		// Start the MCP server from the exercise directory
		console.log(`Starting MCP server on port ${mcpServerPort}...`)
		mcpServerProcess = execa(
			'npx',
			['wrangler', 'dev', '--port', mcpServerPort.toString()],
			{
				cwd: process.cwd(),
				stdio: ['ignore', 'pipe', 'pipe'],
				env: {
					...process.env,
					PORT: mcpServerPort.toString(),
				},
			},
		)

		try {
			// Wait for both servers to be ready simultaneously
			await Promise.all([
				appServerProcess
					? waitForServerReady({
							process: appServerProcess,
							textMatch: '7788',
							name: '[APP-SERVER]',
							outputBuffer: appServerOutput,
						}).then(() =>
							waitForResourceReady('http://localhost:7788/healthcheck'),
						)
					: Promise.resolve(),
				waitForServerReady({
					process: mcpServerProcess,
					textMatch: mcpServerPort.toString(),
					name: '[MCP-SERVER]',
					outputBuffer: mcpServerOutput,
				}),
			])

			console.log('Servers started successfully')
		} catch (error) {
			// Display buffered output on failure
			displayBufferedOutput()
			throw error
		}
	}

	async function cleanup() {
		console.log('Cleaning up servers...')

		const cleanupPromises: Array<Promise<void>> = []

		if (mcpServerProcess && !mcpServerProcess.killed) {
			cleanupPromises.push(
				(async () => {
					mcpServerProcess.kill('SIGTERM')
					// Give it time to gracefully shutdown, then force kill
					const timeout = setTimeout(() => {
						if (mcpServerProcess && !mcpServerProcess.killed) {
							mcpServerProcess.kill('SIGKILL')
						}
					}, 500)

					try {
						await mcpServerProcess
					} catch {
						// Process was killed, which is expected
					} finally {
						clearTimeout(timeout)
					}
				})(),
			)
		}

		if (appServerProcess && !appServerProcess.killed) {
			cleanupPromises.push(
				(async () => {
					appServerProcess.kill('SIGTERM')
					// Give time to gracefully shutdown, then force kill
					const timeout = setTimeout(() => {
						if (appServerProcess && !appServerProcess.killed) {
							appServerProcess.kill('SIGKILL')
						}
					}, 500)

					try {
						await appServerProcess
					} catch {
						// Process was killed, which is expected
					} finally {
						clearTimeout(timeout)
					}
				})(),
			)
		}

		// Wait for all cleanup to complete, but with an overall timeout
		try {
			await Promise.race([
				Promise.all(cleanupPromises),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Cleanup timeout')), 5000),
				),
			])
		} catch (error) {
			console.warn(
				'Cleanup warning:',
				error instanceof Error ? error.message : String(error),
			)
			// Force kill any remaining processes
			if (mcpServerProcess && !mcpServerProcess.killed) {
				mcpServerProcess.kill('SIGKILL')
			}
			if (appServerProcess && !appServerProcess.killed) {
				appServerProcess.kill('SIGKILL')
			}
		}

		console.log('Servers cleaned up')
	}

	// Start servers and wait for them to be ready before returning
	await startServers()

	// Return cleanup function
	return cleanup
}

function waitForResourceReady(resourceUrl: string) {
	const timeoutSignal = AbortSignal.timeout(10_000)
	let lastError: Error | null = null
	return new Promise<void>((resolve, reject) => {
		timeoutSignal.addEventListener('abort', () => {
			const error = lastError ?? new Error('No other errors detected')
			error.message = `Timed out waiting for ${resourceUrl}:\n Last Error:${error.message}`
			reject(error)
		})
		async function checkResource() {
			try {
				const response = await fetch(resourceUrl)
				if (response.ok) return resolve()
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error))
			}
			await sleep(100, timeoutSignal)
			await checkResource()
		}
		return checkResource()
	})
}

function sleep(ms: number, signal?: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort)
			resolve()
		}, ms)

		function onAbort() {
			clearTimeout(timeout)
			reject(new Error('Sleep aborted'))
		}
		signal?.addEventListener('abort', onAbort)
	})
}
