import { Form } from 'react-router'
import { migrate } from '../../workers/db/migrations'
import { sql } from '../../workers/db/utils'
import { type Route } from './+types/index'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Epic Me' },
		{ name: 'description', content: 'The Epic Me Journaling App' },
	]
}

export async function loader({ context }: Route.LoaderArgs) {
	const users = await context.db.getAllUsers()
	const usersWithTheirData = await Promise.all(
		users.map(async (user) => {
			const entries = await context.db.getEntries(user.id)
			const tags = await context.db.getTags(user.id)

			// Get full entry data including createdAt for each entry
			const fullEntries = await Promise.all(
				entries.map(async (entry) => {
					const fullEntry = await context.db.getEntry(user.id, entry.id)
					if (!fullEntry) {
						return null // Ignore entries that aren't found
					}

					return {
						...entry,
						createdAt: fullEntry.createdAt,
						formattedDate: new Date(
							fullEntry.createdAt * 1000,
						).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit',
						}),
					}
				}),
			)

			// Filter out null entries
			const validEntries = fullEntries.filter(
				(entry): entry is NonNullable<typeof entry> => entry !== null,
			)

			// Get full tag data including createdAt for each tag
			const fullTags = await Promise.all(
				tags.map(async (tag) => {
					const fullTag = await context.db.getTag(user.id, tag.id)
					if (!fullTag) {
						return null // Ignore tags that aren't found
					}

					return {
						...tag,
						createdAt: fullTag.createdAt,
						formattedDate: new Date(
							fullTag.createdAt * 1000,
						).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
						}),
					}
				}),
			)

			// Filter out null tags
			const validTags = fullTags.filter(
				(tag): tag is NonNullable<typeof tag> => tag !== null,
			)

			return { ...user, entries: validEntries, tags: validTags }
		}),
	)
	return { users: usersWithTheirData }
}

export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'reset-database') {
		try {
			const { cloudflare } = context
			const { env } = cloudflare

			// Reset database by dropping all tables and rerunning migrations
			await env.EPIC_ME_DB.batch([
				env.EPIC_ME_DB.prepare(sql`DROP TABLE IF EXISTS entry_tags`),
				env.EPIC_ME_DB.prepare(sql`DROP TABLE IF EXISTS tags`),
				env.EPIC_ME_DB.prepare(sql`DROP TABLE IF EXISTS entries`),
				env.EPIC_ME_DB.prepare(sql`DROP TABLE IF EXISTS users`),
				env.EPIC_ME_DB.prepare(sql`DROP TABLE IF EXISTS schema_versions`),
			])

			// Rerun migrations to recreate all tables and seed data
			await migrate(env.EPIC_ME_DB)

			// Clear all KV data
			const kvList = await env.OAUTH_KV.list()
			if (kvList.keys.length > 0) {
				for (const key of kvList.keys) {
					await env.OAUTH_KV.delete(key.name)
				}
			}

			return {
				success: true,
				message: 'Database and KV store reset successfully!',
			}
		} catch (error) {
			console.error('Error resetting database:', error)
			return {
				success: false,
				message: 'Failed to reset database and KV store',
			}
		}
	}

	return { success: false, message: 'Invalid action' }
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { users } = loaderData

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 dark:from-gray-900 dark:to-gray-800">
			<div className="mx-auto max-w-6xl">
				<h1 className="mb-8 text-4xl font-bold text-gray-900 dark:text-white">
					Epic Me App
				</h1>

				<section className="mb-12">
					<h2 className="mb-6 text-2xl font-bold text-gray-800 dark:text-gray-200">
						Users & Entries
					</h2>
					<div className="grid gap-8">
						{users.map((user) => (
							<div
								key={user.id}
								className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 dark:shadow-gray-900/50"
							>
								<div className="mb-4 flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
										<span className="text-lg font-bold">
											{user.email.charAt(0).toUpperCase()}
										</span>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 dark:text-white">
										{user.email}
									</h3>
								</div>

								{user.entries.length > 0 ? (
									<div className="space-y-3">
										<h4 className="text-sm font-medium tracking-wide text-gray-600 uppercase dark:text-gray-400">
											Entries ({user.entries.length})
										</h4>
										<div className="grid gap-3">
											{user.entries.map((entry) => (
												<div
													key={entry.id}
													className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
												>
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<h5 className="font-semibold text-gray-900 dark:text-white">
																{entry.title}
															</h5>
															<div className="mt-1 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
																<span className="flex items-center gap-1">
																	<svg
																		className="h-4 w-4"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
																		/>
																	</svg>
																	{entry.formattedDate}
																</span>
																<span className="flex items-center gap-1">
																	<svg
																		className="h-4 w-4"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
																		/>
																	</svg>
																	{entry.tagCount} tag
																	{entry.tagCount !== 1 ? 's' : ''}
																</span>
																<span className="text-xs text-gray-500 dark:text-gray-400">
																	ID: {entry.id}
																</span>
															</div>
														</div>
													</div>
												</div>
											))}
										</div>
									</div>
								) : (
									<div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
										<svg
											className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
										<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
											No entries yet
										</p>
									</div>
								)}

								{user.tags.length > 0 && (
									<div className="mt-6">
										<h4 className="mb-3 text-sm font-medium tracking-wide text-gray-600 uppercase dark:text-gray-400">
											Tags ({user.tags.length})
										</h4>
										<div className="grid gap-2">
											{user.tags.map((tag) => (
												<div
													key={tag.id}
													className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-700"
												>
													<span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
														{tag.name}
													</span>
													<span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
														<svg
															className="h-3 w-3"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
															/>
														</svg>
														{tag.formattedDate}
													</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				</section>

				<hr className="my-6" />

				<section>
					<h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
						Database Reset
					</h2>
					<p className="mb-6 text-gray-600 dark:text-gray-300">
						This allows you to completely reset the database and KV store. This
						will delete all data and rerun migrations to recreate the schema
						with fresh data.
					</p>

					<div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
						<div className="flex">
							<div className="flex-shrink-0">
								<svg
									className="h-5 w-5 text-yellow-400 dark:text-yellow-300"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3">
								<h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
									Warning
								</h3>
								<div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
									<p>
										This action will permanently delete all data in the database
										and KV store.
									</p>
								</div>
							</div>
						</div>
					</div>

					<Form method="post">
						<input type="hidden" name="intent" value="reset-database" />
						<button
							type="submit"
							className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition-colors duration-200 hover:bg-red-700"
							onClick={(e) => {
								if (
									!confirm(
										'Are you absolutely sure you want to reset the database and KV store? This will delete ALL data and cannot be undone.',
									)
								) {
									e.preventDefault()
								}
							}}
						>
							Reset Database and KV Store
						</button>
					</Form>
				</section>
			</div>
		</div>
	)
}
