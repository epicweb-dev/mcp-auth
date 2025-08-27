import { DBClient } from '@epic-web/epicme-db-client'

export const EPIC_ME_AUTH_SERVER_URL = 'http://localhost:7788'

// 🐨 accept an oauthToken string parameter
export function getClient() {
	// 🐨 pass the oauthToken to the DBClient constructor as the second argument
	return new DBClient(EPIC_ME_AUTH_SERVER_URL)
}
