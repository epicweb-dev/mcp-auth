import { Form, useSearchParams } from 'react-router'
import { z } from 'zod'
import { type EpicExecutionContext } from '#types/helpers'
import { type Route } from './+types/authorize'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'OAuth Authorization - Epic Me' },
		{ name: 'description', content: 'Authorize OAuth access to Epic Me' },
	]
}

export async function loader({ context }: Route.LoaderArgs) {
	const users = await context.db.getAllUsers()
	return { users }
}

const requestParamsSchema = z
	.object({
		response_type: z.string().default('code'),
		client_id: z.string(),
		code_challenge: z.string(),
		code_challenge_method: z.string(),
		redirect_uri: z.string(),
		scope: z
			.string()
			.default('')
			.transform((s) => s.split(' ')),
		state: z.string().optional().default(''),
	})
	.passthrough()
	.transform(
		({
			response_type: responseType,
			client_id: clientId,
			code_challenge: codeChallenge,
			code_challenge_method: codeChallengeMethod,
			redirect_uri: redirectUri,
			...val
		}) => ({
			responseType,
			clientId,
			codeChallenge,
			codeChallengeMethod,
			redirectUri,
			...val,
		}),
	)

export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData()
	const selectedUserId = formData.get('userId')

	if (!selectedUserId) {
		return { status: 'error', message: 'No user selected' } as const
	}

	try {
		const user = await context.db.getUserById(Number(selectedUserId))
		if (!user) {
			return { status: 'error', message: 'User not found' } as const
		}

		const url = new URL(request.url)

		const requestParams = requestParamsSchema.parse(
			Object.fromEntries(url.searchParams),
		)

		const { redirectTo } =
			await context.cloudflare.env.OAUTH_PROVIDER.completeAuthorization({
				request: requestParams,
				userId: String(user.id),
				metadata: {
					label: user.email,
				},
				scope: requestParams.scope || [],
				props: {
					userId: String(user.id),
					userEmail: user.email,
				} satisfies EpicExecutionContext['props'],
			})

		return { status: 'success', redirectTo, userId: user.id } as const
	} catch (error) {
		console.error('Error completing authorization:', error)
		return {
			status: 'error',
			message: 'Failed to complete authorization',
		} as const
	}
}

// Available scopes for the OAuth application
const AVAILABLE_SCOPES = [
	{
		value: 'user:read',
		label: 'Read User',
		description: 'View your user profile information',
	},
	{
		value: 'user:write',
		label: 'Write User',
		description: 'Modify your user profile information',
	},
	{
		value: 'entries:read',
		label: 'Read Entries',
		description: 'View your journal entries',
	},
	{
		value: 'entries:write',
		label: 'Write Entries',
		description: 'Create and modify journal entries',
	},
	{ value: 'tags:read', label: 'Read Tags', description: 'View your tags' },
	{
		value: 'tags:write',
		label: 'Write Tags',
		description: 'Create and modify tags',
	},
] as const

export default function Authorize({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { users } = loaderData
	const [searchParams, setSearchParams] = useSearchParams()

	// Get current scopes from URL params
	const currentScopes =
		searchParams.get('scope')?.split(' ').filter(Boolean) || []

	// Handle scope checkbox changes
	const handleScopeChange = (scopeValue: string, checked: boolean) => {
		const newScopes = checked
			? [...currentScopes, scopeValue]
			: currentScopes.filter((scope) => scope !== scopeValue)

		setSearchParams(
			(prev) => {
				const newParams = new URLSearchParams(prev)
				if (newScopes.length > 0) {
					newParams.set('scope', newScopes.join(' '))
				} else {
					newParams.delete('scope')
				}
				return newParams
			},
			{ preventScrollReset: true, replace: true },
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 dark:from-gray-900 dark:to-gray-800">
			<div className="mx-auto max-w-4xl">
				<div className="mb-8 text-center">
					<h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
						OAuth Authorization
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-300">
						Select a user to authorize OAuth access to Epic Me
					</p>
				</div>

				<div className="mb-8 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 dark:shadow-gray-900/50">
					<div className="mb-4 flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-blue-600 text-white">
							<svg
								className="h-6 w-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div>
							<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
								Authorization Request
							</h2>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								An application is requesting access to your Epic Me account
							</p>
						</div>
					</div>

					<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
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
									Important Notice
								</h3>
								<div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
									<p>
										This authorization will grant the requesting application
										access to your Epic Me data. Please select the user account
										you want to authorize along with the scopes you're
										comfortable granting.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{actionData?.status === 'error' && actionData?.message ? (
					<div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-700 dark:bg-red-900/20">
						<div className="flex">
							<div className="flex-shrink-0">
								<svg
									className="h-5 w-5 text-red-400 dark:text-red-300"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3">
								<h3 className="text-sm font-medium text-red-800 dark:text-red-200">
									Authorization Failed
								</h3>
								<div className="mt-2 text-sm text-red-700 dark:text-red-300">
									<p>{actionData.message}</p>
								</div>
							</div>
						</div>
					</div>
				) : null}

				<div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700">
					<h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
						What happens when you authorize?
					</h3>
					<ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
						<li className="flex items-center gap-2">
							<svg
								className="h-4 w-4 text-green-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
							The application will receive access to your Epic Me data
						</li>
						<li className="flex items-center gap-2">
							<svg
								className="h-4 w-4 text-green-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
							You can revoke access at any time
						</li>
						<li className="flex items-center gap-2">
							<svg
								className="h-4 w-4 text-green-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
							Your data remains secure and private
						</li>
					</ul>
				</div>

				{/* Scopes Selection */}
				<section className="mb-8">
					<div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 dark:shadow-gray-900/50">
						<div className="mb-4 flex items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white">
								<svg
									className="h-6 w-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
									/>
								</svg>
							</div>
							<div>
								<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
									Select Permissions
								</h2>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Choose what the application can access
								</p>
							</div>
						</div>

						<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
							<div className="flex">
								<div className="flex-shrink-0">
									<svg
										className="h-4 w-4 text-blue-400 dark:text-blue-300"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<div className="ml-3">
									<p className="text-sm text-blue-700 dark:text-blue-300">
										<strong>Note:</strong> The selected scopes are stored in the
										URL search parameters. Checking or unchecking these boxes
										will update the{' '}
										<code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs dark:bg-blue-800">
											scope
										</code>{' '}
										parameter in the URL.
									</p>
								</div>
							</div>
						</div>

						<div className="grid gap-3 md:grid-cols-2">
							{AVAILABLE_SCOPES.map((scope) => (
								<label
									key={scope.value}
									className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-purple-300 hover:bg-purple-50 dark:border-gray-600 dark:hover:border-purple-500 dark:hover:bg-purple-900/20"
								>
									<input
										type="checkbox"
										checked={currentScopes.includes(scope.value)}
										onChange={(e) =>
											handleScopeChange(scope.value, e.target.checked)
										}
										className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-purple-400"
									/>
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<span className="font-medium text-gray-900 dark:text-white">
												{scope.label}
											</span>
											<span className="rounded-full bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
												{scope.value}
											</span>
										</div>
										<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
											{scope.description}
										</p>
									</div>
								</label>
							))}
						</div>
					</div>
				</section>

				<section className="mb-8">
					<h2 className="mb-6 text-2xl font-bold text-gray-800 dark:text-gray-200">
						Select User Account
					</h2>

					<div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-700 dark:bg-blue-900/20">
						<div className="flex">
							<div className="flex-shrink-0">
								<svg
									className="h-5 w-5 text-blue-400 dark:text-blue-300"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3">
								<h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
									Demo Environment Notice
								</h3>
								<div className="mt-2 flex flex-col gap-2 text-sm text-blue-700 dark:text-blue-300">
									<p>
										Normally, in a real OAuth flow, you don't select which user
										to authorize - you'd be authorizing for the user you're
										currently logged in as. This demo lets you test with
										different user accounts.
									</p>
									<p>
										Also, once you authorize, you'd normally be automatically
										redirected to complete the OAuth flow. Since this is a demo
										environment, please click the link above to continue.
									</p>
								</div>
							</div>
						</div>
					</div>

					{users.length > 0 ? (
						<div className="grid gap-4">
							{users.map((user) => {
								const isSelectedUser = user.id === actionData?.userId
								return (
									<div
										key={user.id}
										className={`group relative rounded-xl border-2 p-6 transition-all ${
											isSelectedUser && actionData?.status === 'success'
												? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
												: actionData?.status === 'success'
													? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
													: 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500'
										} ${
											actionData?.status === 'success' && !isSelectedUser
												? 'opacity-50'
												: ''
										}`}
									>
										<div className="flex items-center gap-4">
											<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
												<span className="text-2xl font-bold">
													{user.email.charAt(0).toUpperCase()}
												</span>
											</div>

											<div className="flex-1">
												<h3 className="text-xl font-semibold text-gray-900 dark:text-white">
													{user.email}
												</h3>
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
														{new Date(user.createdAt * 1000).toLocaleDateString(
															'en-US',
															{
																year: 'numeric',
																month: 'short',
																day: 'numeric',
															},
														)}
													</span>
													<span className="text-xs text-gray-500 dark:text-gray-400">
														ID: {user.id}
													</span>
												</div>
												{isSelectedUser && actionData?.status === 'success' && (
													<div className="mt-3">
														<div className="mb-3 flex items-center gap-2">
															<svg
																className="h-4 w-4 text-green-500"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M5 13l4 4L19 7"
																/>
															</svg>
															<span className="text-sm font-medium text-green-700 dark:text-green-300">
																Authorization Successful!
															</span>
														</div>

														<div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-700 dark:bg-green-900/20">
															<h4 className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">
																Redirect URL Parameters:
															</h4>
															<div className="space-y-1 text-xs">
																{(() => {
																	const url = new URL(actionData.redirectTo)
																	const params = Object.fromEntries(
																		url.searchParams.entries(),
																	)
																	return Object.entries(params).map(
																		([key, value]) => (
																			<div key={key} className="flex gap-2">
																				<span className="font-mono font-medium text-green-700 dark:text-green-300">
																					{key}:
																				</span>
																				<span className="font-mono break-all text-green-600 dark:text-green-400">
																					{value}
																				</span>
																			</div>
																		),
																	)
																})()}
															</div>
														</div>

														<a
															href={actionData.redirectTo}
															className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-green-700 hover:shadow-xl focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none dark:bg-green-500 dark:hover:bg-green-600 dark:focus:ring-green-400"
														>
															<svg
																className="h-5 w-5"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
																/>
															</svg>
															Continue OAuth Flow
														</a>
													</div>
												)}
											</div>

											<div className="flex items-center justify-center">
												<div
													className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-all dark:bg-blue-900 dark:text-blue-200 ${
														actionData?.status === 'success'
															? ''
															: 'group-hover:bg-blue-200 dark:group-hover:bg-blue-800'
													}`}
												>
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
															d="M9 5l7 7-7 7"
														/>
													</svg>
												</div>
											</div>
										</div>
										{!isSelectedUser && actionData?.status !== 'success' ? (
											<Form method="post" className="absolute inset-0">
												<input type="hidden" name="userId" value={user.id} />
												<button
													type="submit"
													className="h-full w-full cursor-pointer opacity-0"
													aria-label={`Authorize as ${user.email}`}
												/>
											</Form>
										) : null}
									</div>
								)
							})}
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
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
								/>
							</svg>
							<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
								No users available for authorization
							</p>
						</div>
					)}
				</section>

				{/* Search Parameters Form */}
				<section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
					<h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
						Update Search Parameters
					</h2>
					<p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
						Modify the OAuth request parameters below:
					</p>
					<p className="mb-4 text-xs text-gray-500 italic dark:text-gray-400">
						Note: Changing these values should not be necessary and may break
						the integration. This form is displayed for demonstration purposes
						only.
					</p>

					<form method="get" className="space-y-4">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label
									htmlFor="response_type"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Response Type
								</label>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									The OAuth response type (e.g., "code" for authorization code
									flow)
								</p>
								<input
									type="text"
									id="response_type"
									name="response_type"
									defaultValue={searchParams.get('response_type') ?? undefined}
									className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>

							<div>
								<label
									htmlFor="client_id"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Client ID
								</label>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									The unique identifier for the OAuth client application
								</p>
								<input
									type="text"
									id="client_id"
									name="client_id"
									defaultValue={searchParams.get('client_id') ?? undefined}
									className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>

							<div>
								<label
									htmlFor="code_challenge"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Code Challenge
								</label>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									The PKCE code challenge for enhanced security
								</p>
								<input
									type="text"
									id="code_challenge"
									name="code_challenge"
									defaultValue={searchParams.get('code_challenge') ?? undefined}
									className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>

							<div>
								<label
									htmlFor="code_challenge_method"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Code Challenge Method
								</label>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									The method used for PKCE (e.g., "S256" for SHA256)
								</p>
								<input
									type="text"
									id="code_challenge_method"
									name="code_challenge_method"
									defaultValue={
										searchParams.get('code_challenge_method') ?? undefined
									}
									className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>

							<div>
								<label
									htmlFor="redirect_uri"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Redirect URI
								</label>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									The URI where the user will be redirected after authorization
								</p>
								<input
									type="url"
									id="redirect_uri"
									name="redirect_uri"
									defaultValue={searchParams.get('redirect_uri') ?? undefined}
									className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>

							<div>
								<label
									htmlFor="state"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									State
								</label>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Optional parameter to maintain state between request and
									callback
								</p>
								<input
									type="text"
									id="state"
									name="state"
									defaultValue={searchParams.get('state') ?? undefined}
									className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>
						</div>

						<div className="flex gap-3">
							<button
								type="submit"
								className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400"
							>
								Update Parameters
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	)
}
