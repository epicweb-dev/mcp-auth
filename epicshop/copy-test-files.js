#!/usr/bin/env node

import { existsSync } from 'fs'
import { readdir, stat, copyFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'

const EXERCISES_DIR = join(process.cwd(), '..', 'exercises')

/**
 * Copy test files from solution directories to their corresponding problem directories
 */
async function copyTestFiles() {
	console.log('🔍 Scanning exercises directory...')

	try {
		const exerciseDirs = await readdir(EXERCISES_DIR)
		const exerciseNumbers = exerciseDirs
			.filter((dir) => /^\d+\./.test(dir))
			.sort()

		console.log(
			`📁 Found ${exerciseNumbers.length} exercise directories: ${exerciseNumbers.join(', ')}`,
		)

		let totalCopied = 0
		let totalSkipped = 0

		for (const exerciseDir of exerciseNumbers) {
			const exercisePath = join(EXERCISES_DIR, exerciseDir)
			const exerciseStats = await stat(exercisePath)

			if (!exerciseStats.isDirectory()) continue

			console.log(`\n📂 Processing ${exerciseDir}...`)

			const exerciseContents = await readdir(exercisePath)
			const solutionDirs = exerciseContents.filter((item) =>
				item.includes('.solution.'),
			)

			for (const solutionDir of solutionDirs) {
				const problemDir = solutionDir.replace('.solution.', '.problem.')

				const solutionPath = join(exercisePath, solutionDir)
				const problemPath = join(exercisePath, problemDir)

				// Check if both directories exist
				if (!existsSync(solutionPath) || !existsSync(problemPath)) {
					console.log(
						`  ⚠️  Skipping ${solutionDir} - corresponding problem directory not found`,
					)
					continue
				}

				const solutionTestPath = join(solutionPath, 'test')
				const problemTestPath = join(problemPath, 'test')

				// Check if solution test directory exists
				if (!existsSync(solutionTestPath)) {
					console.log(
						`  ⚠️  Skipping ${solutionDir} - no test directory in solution`,
					)
					continue
				}

				// Ensure problem test directory exists
				if (!existsSync(problemTestPath)) {
					await mkdir(problemTestPath, { recursive: true })
					console.log(`  📁 Created test directory for ${problemDir}`)
				}

				// Copy test files
				const testFiles = await readdir(solutionTestPath)
				let copiedInThisDir = 0

				for (const testFile of testFiles) {
					const sourceFile = join(solutionTestPath, testFile)
					const destFile = join(problemTestPath, testFile)

					try {
						await copyFile(sourceFile, destFile)
						console.log(
							`  ✅ Copied ${testFile} from ${solutionDir} to ${problemDir}`,
						)
						copiedInThisDir++
					} catch (error) {
						console.log(`  ❌ Failed to copy ${testFile}: ${error.message}`)
					}
				}

				if (copiedInThisDir > 0) {
					totalCopied += copiedInThisDir
					console.log(`  📊 Copied ${copiedInThisDir} files for ${problemDir}`)
				} else {
					totalSkipped++
				}
			}
		}

		console.log(`\n🎉 Copy operation completed!`)
		console.log(`📊 Total files copied: ${totalCopied}`)
		console.log(`⚠️  Directories skipped: ${totalSkipped}`)
	} catch (error) {
		console.error('❌ Error:', error.message)
		process.exit(1)
	}
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
	copyTestFiles()
}

export { copyTestFiles }
