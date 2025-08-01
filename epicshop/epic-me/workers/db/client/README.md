# Epic Me DB Client

A typesafe client for making requests to the Epic Me database API.

## Installation

```bash
npm install
```

## Usage

```typescript
import { DBClient } from './index.js'

// Create a client instance with your base URL
const client = new DBClient('https://your-app.com')

// Entry operations
const entry = await client.createEntry({
	title: 'My Journal Entry',
	content: 'Today was a great day!',
	mood: 'happy',
	location: 'home',
	weather: 'sunny',
	isPrivate: 1,
	isFavorite: 0,
})

const entries = await client.getEntries({
	tagIds: [1, 2],
	from: '2024-01-01',
	to: '2024-12-31',
})

const entry = await client.getEntry(1)
await client.updateEntry(1, { title: 'Updated Title' })
await client.deleteEntry(1)

// Tag operations
const tag = await client.createTag({
	name: 'Work',
	description: 'Work-related entries',
})

const tags = await client.getTags()
const tag = await client.getTag(1)
await client.updateTag(1, { name: 'Updated Tag' })
await client.deleteTag(1)

// Entry-Tag operations
await client.addTagToEntry({ entryId: 1, tagId: 1 })
const entryTags = await client.getEntryTags(1)
```

## API Reference

### Constructor

```typescript
new DBClient(baseUrl: string)
```

Creates a new client instance with the specified base URL.

### Entry Methods

- `createEntry(entry: NewEntry): Promise<EntryWithTags>`
- `getEntry(id: number): Promise<EntryWithTags | null>`
- `getEntries(options?: { tagIds?: number[], from?: string, to?: string }): Promise<Array<{ id: number, title: string, tagCount: number }>>`
- `updateEntry(id: number, entry: Partial<NewEntry>): Promise<EntryWithTags>`
- `deleteEntry(id: number): Promise<boolean>`

### Tag Methods

- `createTag(tag: NewTag): Promise<Tag>`
- `getTag(id: number): Promise<Tag | null>`
- `getTags(): Promise<Array<{ id: number, name: string }>>`
- `updateTag(id: number, tag: Partial<NewTag>): Promise<Tag>`
- `deleteTag(id: number): Promise<boolean>`

### Entry-Tag Methods

- `addTagToEntry(entryTag: NewEntryTag): Promise<EntryTag>`
- `getEntryTags(entryId: number): Promise<Tag[]>`

## Error Handling

The client will throw `Error` instances with descriptive messages for:

- Network errors
- HTTP errors (4xx, 5xx)
- API errors returned by the server
- Validation errors

## Types

All types are exported from the client for use in your application:

```typescript
import type {
	Entry,
	NewEntry,
	Tag,
	NewTag,
	EntryTag,
	NewEntryTag,
	EntryWithTags,
} from './index.js'
```
