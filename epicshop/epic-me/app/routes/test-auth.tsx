import { z } from 'zod'
import { type Route } from './+types/test-auth'

const requestParamsSchema = z
	.object({
		response_type: z.string().default('code'),
		client_id: z.string(),
		code_challenge: z.string(),
		code_challenge_method: z.string(),
		redirect_uri: z.string(),
		scope: z
			.string()
			.optional()
			.default('')
			.transform((s) => (s ? s.split(' ') : [])),
		state: z.string().optional().default(''),
		user_id: z.string().optional(), // For programmatic testing
	})
	.passthrough()
	.transform(
		({
			response_type: responseType,
			client_id: clientId,
			code_challenge: codeChallenge,
			code_challenge_method: codeChallengeMethod,
			redirect_uri: redirectUri,
			user_id: userId,
			...val
		}) => ({
			responseType,
			clientId,
			codeChallenge,
			codeChallengeMethod,
			redirectUri,
			userId,
			...val,
		}),
	)

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url)

	try {
		const requestParams = requestParamsSchema.parse(
			Object.fromEntries(url.searchParams),
		)

		// Default to first user for testing if no user_id specified
		let userId = requestParams.userId
		if (!userId) {
			const users = await context.db.getAllUsers()
			if (users.length === 0) {
				return Response.json({ error: 'No users available' }, { status: 400 })
			}
			userId = String(users[0]?.id)
		}

		const user = await context.db.getUserById(Number(userId))
		if (!user) {
			return Response.json({ error: 'User not found' }, { status: 404 })
		}

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
				},
			})

		return Response.json({ redirectTo, userId: user.id })
	} catch (error) {
		console.error('Error in test-auth:', error)
		return Response.json(
			{
				error: 'Failed to complete authorization',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		)
	}
}
