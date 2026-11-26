// What /api/hits returns. Kept outside $lib/server so pages can import it.
export interface HitStats {
	total: number;
	today: number;
	/** The last 30 days, oldest first, including days with no views. */
	days: { day: string; views: number }[];
	top: { path: string; views: number }[];
}
