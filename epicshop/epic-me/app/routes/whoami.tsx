import { redirect } from 'react-router'
import { type Route } from './+types/whoami'

export function meta() {
	return [
		{ title: 'Who Am I - Epic Me' },
		{ name: 'description', content: 'Current user information' },
	]
}

export async function loader({ context }: Route.LoaderArgs) {
	try {
		// Get user info from OAuth props (automatically validated by OAuth provider)
		const userId = context.cloudflare.ctx.props.userId

		if (!userId) {
			throw redirect('/')
		}

		// Get user from database using the email from OAuth props
		const user = await context.db.getUserById(Number(userId))

		if (!user) {
			throw redirect('/')
		}

		// Get user's entries and tags
		const entries = await context.db.getEntries(user.id)
		const tags = await context.db.getTags(user.id)

		// Get full entry data including createdAt for each entry
		const fullEntries = await Promise.all(
			entries.map(async (entry: any) => {
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
			tags.map(async (tag: any) => {
				const fullTag = await context.db.getTag(user.id, tag.id)
				if (!fullTag) {
					return null // Ignore tags that aren't found
				}

				return {
					...tag,
					createdAt: fullTag.createdAt,
					formattedDate: new Date(fullTag.createdAt * 1000).toLocaleDateString(
						'en-US',
						{
							year: 'numeric',
							month: 'short',
							day: 'numeric',
						},
					),
				}
			}),
		)

		// Filter out null tags
		const validTags = fullTags.filter(
			(tag: any): tag is NonNullable<typeof tag> => tag !== null,
		)

		return {
			user: { ...user, entries: validEntries, tags: validTags },
		}
	} catch (error) {
		console.error('Error in whoami loader:', error)
		throw redirect('/')
	}
}

export default function WhoAmI({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 dark:from-gray-900 dark:to-gray-800">
			<div className="mx-auto max-w-6xl">
				<h1 className="mb-8 text-4xl font-bold text-gray-900 dark:text-white">
					Current User
				</h1>

				<div className="mb-8 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 dark:shadow-gray-900/50">
					<div className="mb-4 flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-blue-600 text-white">
							<span className="text-xl font-bold">
								{user.email.charAt(0).toUpperCase()}
							</span>
						</div>
						<div>
							<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
								{user.email}
							</h2>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								User ID: {user.id}
							</p>
						</div>
					</div>
				</div>

				{user.entries.length > 0 ? (
					<section className="mb-8">
						<h2 className="mb-6 text-2xl font-bold text-gray-800 dark:text-gray-200">
							Your Entries ({user.entries.length})
						</h2>
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
					</section>
				) : (
					<section className="mb-8">
						<h2 className="mb-6 text-2xl font-bold text-gray-800 dark:text-gray-200">
							Your Entries
						</h2>
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
					</section>
				)}

				{user.tags.length > 0 && (
					<section>
						<h2 className="mb-6 text-2xl font-bold text-gray-800 dark:text-gray-200">
							Your Tags ({user.tags.length})
						</h2>
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
					</section>
				)}
			</div>
		</div>
	)
}
