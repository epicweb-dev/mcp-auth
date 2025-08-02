import { type Entry, type NewEntry, type Tag, type NewTag, type EntryTag, type NewEntryTag, type EntryWithTags, type User } from './schema.js';
export declare class DBClient {
    private baseUrl;
    private oauthToken?;
    constructor(baseUrl: string, oauthToken?: string);
    private makeRequest;
    createEntry(entry: NewEntry): Promise<EntryWithTags>;
    getEntry(id: number): Promise<EntryWithTags | null>;
    getEntries(options?: {
        tagIds?: number[];
        from?: string;
        to?: string;
    }): Promise<Array<{
        id: number;
        title: string;
        tagCount: number;
    }>>;
    updateEntry(id: number, entry: Partial<NewEntry>): Promise<EntryWithTags>;
    deleteEntry(id: number): Promise<boolean>;
    createTag(tag: NewTag): Promise<Tag>;
    getTag(id: number): Promise<Tag | null>;
    getTags(): Promise<Array<{
        id: number;
        name: string;
    }>>;
    updateTag(id: number, tag: Partial<NewTag>): Promise<Tag>;
    deleteTag(id: number): Promise<boolean>;
    addTagToEntry(entryTag: NewEntryTag): Promise<EntryTag>;
    getEntryTags(entryId: number): Promise<Tag[]>;
    getUserById(id: number): Promise<User | null>;
}
export type { Entry, NewEntry, Tag, NewTag, EntryTag, NewEntryTag, EntryWithTags, User, };
