import { z } from 'zod';
export declare const userSchema: z.ZodObject<{
    id: z.ZodNumber;
    email: z.ZodString;
    createdAt: z.ZodEffects<z.ZodNumber, number, unknown>;
    updatedAt: z.ZodEffects<z.ZodNumber, number, unknown>;
}, "strip", z.ZodTypeAny, {
    id?: number;
    email?: string;
    createdAt?: number;
    updatedAt?: number;
}, {
    id?: number;
    email?: string;
    createdAt?: unknown;
    updatedAt?: unknown;
}>;
export declare const entrySchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    title: z.ZodString;
    content: z.ZodString;
    mood: z.ZodNullable<z.ZodString>;
    location: z.ZodNullable<z.ZodString>;
    weather: z.ZodNullable<z.ZodString>;
    isPrivate: z.ZodNumber;
    isFavorite: z.ZodNumber;
    createdAt: z.ZodEffects<z.ZodNumber, number, unknown>;
    updatedAt: z.ZodEffects<z.ZodNumber, number, unknown>;
}, "strip", z.ZodTypeAny, {
    id?: number;
    createdAt?: number;
    updatedAt?: number;
    userId?: number;
    title?: string;
    content?: string;
    mood?: string;
    location?: string;
    weather?: string;
    isPrivate?: number;
    isFavorite?: number;
}, {
    id?: number;
    createdAt?: unknown;
    updatedAt?: unknown;
    userId?: number;
    title?: string;
    content?: string;
    mood?: string;
    location?: string;
    weather?: string;
    isPrivate?: number;
    isFavorite?: number;
}>;
export declare const entryWithTagsSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    title: z.ZodString;
    content: z.ZodString;
    mood: z.ZodNullable<z.ZodString>;
    location: z.ZodNullable<z.ZodString>;
    weather: z.ZodNullable<z.ZodString>;
    isPrivate: z.ZodNumber;
    isFavorite: z.ZodNumber;
    createdAt: z.ZodEffects<z.ZodNumber, number, unknown>;
    updatedAt: z.ZodEffects<z.ZodNumber, number, unknown>;
} & {
    tags: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id?: number;
        name?: string;
    }, {
        id?: number;
        name?: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id?: number;
    createdAt?: number;
    updatedAt?: number;
    userId?: number;
    title?: string;
    content?: string;
    mood?: string;
    location?: string;
    weather?: string;
    isPrivate?: number;
    isFavorite?: number;
    tags?: {
        id?: number;
        name?: string;
    }[];
}, {
    id?: number;
    createdAt?: unknown;
    updatedAt?: unknown;
    userId?: number;
    title?: string;
    content?: string;
    mood?: string;
    location?: string;
    weather?: string;
    isPrivate?: number;
    isFavorite?: number;
    tags?: {
        id?: number;
        name?: string;
    }[];
}>;
export declare const newEntrySchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    mood: z.ZodDefault<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    location: z.ZodDefault<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    weather: z.ZodDefault<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    isPrivate: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    isFavorite: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    title?: string;
    content?: string;
    mood?: string;
    location?: string;
    weather?: string;
    isPrivate?: number;
    isFavorite?: number;
}, {
    title?: string;
    content?: string;
    mood?: string;
    location?: string;
    weather?: string;
    isPrivate?: number;
    isFavorite?: number;
}>;
export declare const tagSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodEffects<z.ZodNumber, number, unknown>;
    updatedAt: z.ZodEffects<z.ZodNumber, number, unknown>;
}, "strip", z.ZodTypeAny, {
    id?: number;
    createdAt?: number;
    updatedAt?: number;
    userId?: number;
    name?: string;
    description?: string;
}, {
    id?: number;
    createdAt?: unknown;
    updatedAt?: unknown;
    userId?: number;
    name?: string;
    description?: string;
}>;
export declare const newTagSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string, string>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
}, {
    name?: string;
    description?: string;
}>;
export declare const entryTagSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    entryId: z.ZodNumber;
    tagId: z.ZodNumber;
    createdAt: z.ZodEffects<z.ZodNumber, number, unknown>;
    updatedAt: z.ZodEffects<z.ZodNumber, number, unknown>;
}, "strip", z.ZodTypeAny, {
    id?: number;
    createdAt?: number;
    updatedAt?: number;
    userId?: number;
    entryId?: number;
    tagId?: number;
}, {
    id?: number;
    createdAt?: unknown;
    updatedAt?: unknown;
    userId?: number;
    entryId?: number;
    tagId?: number;
}>;
export declare const newEntryTagSchema: z.ZodObject<{
    entryId: z.ZodNumber;
    tagId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    entryId?: number;
    tagId?: number;
}, {
    entryId?: number;
    tagId?: number;
}>;
export declare const entryIdSchema: {
    id: z.ZodNumber;
};
export declare const tagIdSchema: {
    id: z.ZodNumber;
};
export declare const entryTagIdSchema: {
    entryId: z.ZodNumber;
    tagId: z.ZodNumber;
};
export declare const createEntryInputSchema: {
    title: z.ZodString;
    content: z.ZodString;
    mood: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    weather: z.ZodOptional<z.ZodString>;
    isPrivate: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    isFavorite: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
};
export declare const updateEntryInputSchema: {
    id: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    mood: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    weather: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isPrivate: z.ZodOptional<z.ZodNumber>;
    isFavorite: z.ZodOptional<z.ZodNumber>;
};
export declare const createTagInputSchema: {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
};
export declare const updateTagInputSchema: {
    id: z.ZodNumber;
};
export type Entry = {
    id: number;
    userId: number;
    title: string;
    content: string;
    mood: string | null;
    location: string | null;
    weather: string | null;
    isPrivate: number;
    isFavorite: number;
    createdAt: number;
    updatedAt: number;
};
export type NewEntry = {
    title: string;
    content: string;
    mood?: string | null;
    location?: string | null;
    weather?: string | null;
    isPrivate?: number;
    isFavorite?: number;
};
export type Tag = {
    id: number;
    userId: number;
    name: string;
    description: string | null;
    createdAt: number;
    updatedAt: number;
};
export type NewTag = {
    name: string;
    description?: string;
};
export type EntryTag = {
    id: number;
    userId: number;
    entryId: number;
    tagId: number;
    createdAt: number;
    updatedAt: number;
};
export type NewEntryTag = {
    entryId: number;
    tagId: number;
};
export type User = {
    id: number;
    email: string;
    createdAt: number;
    updatedAt: number;
};
export type EntryWithTags = Entry & {
    tags: Array<{
        id: number;
        name: string;
    }>;
};
