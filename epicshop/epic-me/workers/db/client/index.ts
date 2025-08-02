import { z } from 'zod'
import {
	type Entry,
	type NewEntry,
	type Tag,
	type NewTag,
	type EntryTag,
	type NewEntryTag,
	type EntryWithTags,
	type User,
} from './schema.js'

// Response schemas
const apiResponseSchema = z.object({
	result: z.any(),
})

const errorResponseSchema = z.object({
	error: z.string(),
	details: z.array(z.any()).optional(),
})

export class DBClient {
	private baseUrl: string
	private oauthToken?: string

	constructor(baseUrl: string, oauthToken?: string) {
		this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
		this.oauthToken = oauthToken
	}

	private async makeRequest<T>(
		method: string,
		params: Record<string, any> = {},
	): Promise<T> {
		const response = await fetch(`${this.baseUrl}/db-api`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: this.oauthToken ? `Bearer ${this.oauthToken}` : '',
			},
			body: JSON.stringify({
				method,
				params,
			}),
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			const error = errorResponseSchema.safeParse(errorData)

			if (error.success) {
				throw new Error(error.data.error)
			}

			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		const data = await response.json()
		const parsed = apiResponseSchema.parse(data)

		return parsed.result as T
	}

	// Entry Methods
	async createEntry(entry: NewEntry): Promise<EntryWithTags> {
		return this.makeRequest<EntryWithTags>('createEntry', entry)
	}

	async getEntry(id: number): Promise<EntryWithTags | null> {
		return this.makeRequest<EntryWithTags | null>('getEntry', { id })
	}

	async getEntries(options?: {
		tagIds?: number[]
		from?: string
		to?: string
	}): Promise<Array<{ id: number; title: string; tagCount: number }>> {
		return this.makeRequest('getEntries', options || {})
	}

	async updateEntry(
		id: number,
		entry: Partial<NewEntry>,
	): Promise<EntryWithTags> {
		return this.makeRequest<EntryWithTags>('updateEntry', { id, ...entry })
	}

	async deleteEntry(id: number): Promise<boolean> {
		return this.makeRequest<boolean>('deleteEntry', { id })
	}

	// Tag Methods
	async createTag(tag: NewTag): Promise<Tag> {
		return this.makeRequest<Tag>('createTag', tag)
	}

	async getTag(id: number): Promise<Tag | null> {
		return this.makeRequest<Tag | null>('getTag', { id })
	}

	async getTags(): Promise<Array<{ id: number; name: string }>> {
		return this.makeRequest('getTags', {})
	}

	async updateTag(id: number, tag: Partial<NewTag>): Promise<Tag> {
		return this.makeRequest<Tag>('updateTag', { id, ...tag })
	}

	async deleteTag(id: number): Promise<boolean> {
		return this.makeRequest<boolean>('deleteTag', { id })
	}

	// Entry Tag Methods
	async addTagToEntry(entryTag: NewEntryTag): Promise<EntryTag> {
		return this.makeRequest<EntryTag>('addTagToEntry', entryTag)
	}

	async getEntryTags(entryId: number): Promise<Tag[]> {
		return this.makeRequest<Tag[]>('getEntryTags', { entryId })
	}

	// User Methods
	async getUserById(id: number): Promise<User | null> {
		return this.makeRequest<User | null>('getUserById', { id })
	}
}

// Export types for convenience
export type {
	Entry,
	NewEntry,
	Tag,
	NewTag,
	EntryTag,
	NewEntryTag,
	EntryWithTags,
	User,
}
