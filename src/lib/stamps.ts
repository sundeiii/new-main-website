// Stamps visitors can put on their guestbook entry. The id is what's stored in the database.
export const STAMPS = [
	{ id: 'star', emoji: '⭐', label: 'star' },
	{ id: 'sparkles', emoji: '✨', label: 'sparkles' },
	{ id: 'flower', emoji: '🌸', label: 'flower' },
	{ id: 'moon', emoji: '🌙', label: 'moon' },
	{ id: 'cat', emoji: '🐱', label: 'cat' },
	{ id: 'frog', emoji: '🐸', label: 'frog' },
	{ id: 'mushroom', emoji: '🍄', label: 'mushroom' },
	{ id: 'tea', emoji: '🍵', label: 'tea' },
	{ id: 'music', emoji: '🎵', label: 'music' },
	{ id: 'game', emoji: '🎮', label: 'game' },
	{ id: 'circle', emoji: '⭕', label: 'osu! circle' },
	{ id: 'skull', emoji: '💀', label: 'skull' }
] as const;

// Reactions anyone can add to an entry (one of each per visitor).
export const REACTIONS = [
	{ id: 'heart', emoji: '❤️', label: 'love' },
	{ id: 'laugh', emoji: '😂', label: 'funny' },
	{ id: 'fire', emoji: '🔥', label: 'fire' },
	{ id: 'eyes', emoji: '👀', label: 'eyes' },
	{ id: 'frog', emoji: '🐸', label: 'frog' },
	{ id: 'circle', emoji: '⭕', label: 'osu! circle' }
] as const;
export const reactionById = (id: string | null | undefined) => REACTIONS.find((r) => r.id === id) ?? null;

export type StampId = typeof STAMPS[number]['id'];
export const stampById = (id: string | null | undefined) => STAMPS.find((s) => s.id === id) ?? null;
