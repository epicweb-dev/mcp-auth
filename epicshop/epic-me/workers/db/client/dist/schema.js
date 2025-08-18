var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { z } from 'zod';
// Helper to transform timestamps from SQLite's datetime format
var timestampSchema = z.preprocess(function (val) {
    if (typeof val === 'string') {
        // SQLite datetime format: YYYY-MM-DD HH:MM:SS
        var date = new Date(val.replace(' ', 'T'));
        var timestamp = date.getTime() / 1000;
        return isNaN(timestamp) ? null : timestamp;
    }
    return val;
}, z.number());
export var userSchema = z.object({
    id: z.coerce.number(),
    email: z.string(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
});
// Schema Validation
export var entrySchema = z.object({
    id: z.coerce.number(),
    userId: z.coerce.number(),
    title: z.string(),
    content: z.string(),
    mood: z.string().nullable(),
    location: z.string().nullable(),
    weather: z.string().nullable(),
    isPrivate: z.coerce.number(),
    isFavorite: z.coerce.number(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
});
export var entryListItemSchema = entrySchema
    .pick({
    id: true,
    title: true,
})
    .and(z.object({ tagCount: z.number() }));
export var entryWithTagsSchema = entrySchema.extend({
    tags: z.array(z.object({ id: z.number(), name: z.string() })),
});
export var newEntrySchema = z.object({
    title: z.string(),
    content: z.string(),
    mood: z.string().optional().nullable().default(null),
    location: z.string().optional().nullable().default(null),
    weather: z.string().optional().nullable().default(null),
    isPrivate: z.number().optional().default(1),
    isFavorite: z.number().optional().default(0),
});
export var tagSchema = z.object({
    id: z.coerce.number(),
    userId: z.coerce.number(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
});
export var tagListItemSchema = tagSchema.pick({
    id: true,
    name: true,
});
export var newTagSchema = z.object({
    name: z.string(),
    description: z
        .string()
        .nullable()
        .optional()
        .transform(function (val) { return val !== null && val !== void 0 ? val : null; }),
});
export var entryTagSchema = z.object({
    id: z.coerce.number(),
    userId: z.coerce.number(),
    entryId: z.coerce.number(),
    tagId: z.coerce.number(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
});
export var newEntryTagSchema = z.object({
    entryId: z.number(),
    tagId: z.number(),
});
export var entryIdSchema = { id: z.number().describe('The ID of the entry') };
export var tagIdSchema = { id: z.number().describe('The ID of the tag') };
export var entryTagIdSchema = {
    entryId: z.number().describe('The ID of the entry'),
    tagId: z.number().describe('The ID of the tag'),
};
export var createEntryInputSchema = {
    title: z.string().describe('The title of the entry'),
    content: z.string().describe('The content of the entry'),
    mood: z
        .string()
        .optional()
        .describe('The mood of the entry (for example: "happy", "sad", "anxious", "excited")'),
    location: z
        .string()
        .optional()
        .describe('The location of the entry (for example: "home", "work", "school", "park")'),
    weather: z
        .string()
        .optional()
        .describe('The weather of the entry (for example: "sunny", "cloudy", "rainy", "snowy")'),
    isPrivate: z
        .number()
        .optional()
        .default(1)
        .describe('Whether the entry is private (1 for private, 0 for public)'),
    isFavorite: z
        .number()
        .optional()
        .default(0)
        .describe('Whether the entry is a favorite (1 for favorite, 0 for not favorite)'),
    tags: z
        .array(z.number())
        .optional()
        .describe('The IDs of the tags to add to the entry'),
};
export var updateEntryInputSchema = {
    id: z.number(),
    title: z.string().optional().describe('The title of the entry'),
    content: z.string().optional().describe('The content of the entry'),
    mood: z
        .string()
        .nullable()
        .optional()
        .describe('The mood of the entry (for example: "happy", "sad", "anxious", "excited")'),
    location: z
        .string()
        .nullable()
        .optional()
        .describe('The location of the entry (for example: "home", "work", "school", "park")'),
    weather: z
        .string()
        .nullable()
        .optional()
        .describe('The weather of the entry (for example: "sunny", "cloudy", "rainy", "snowy")'),
    isPrivate: z
        .number()
        .optional()
        .describe('Whether the entry is private (1 for private, 0 for public)'),
    isFavorite: z
        .number()
        .optional()
        .describe('Whether the entry is a favorite (1 for favorite, 0 for not favorite)'),
};
export var createTagInputSchema = {
    name: z.string().describe('The name of the tag'),
    description: z.string().optional().describe('The description of the tag'),
};
export var updateTagInputSchema = __assign({ id: z.number() }, Object.fromEntries(Object.entries(createTagInputSchema).map(function (_a) {
    var key = _a[0], value = _a[1];
    return [
        key,
        value.nullable().optional(),
    ];
})));
