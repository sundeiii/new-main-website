// The tournament list as it was hardcoded in the tournaments page. Used to fill the database the
// first time (admin > tournaments > import), and shown on the site until then.

export interface TournamentHost {
	name: string;
	id: number;
}

export interface Tournament {
	id?: number;
	year: string;
	name: string;
	role: string;
	link: string;
	banner?: string | null;
	badge?: string | null;
	hosts: TournamentHost[];
}

export interface TournamentYear {
	year: string;
	events: Omit<Tournament, 'year'>[];
}

export const tournamentSeed: TournamentYear[] = [
	{
		year: '2025',
		events: [
			{ name: 'Strongest ASCII Battlegrounds', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2104987', hosts: [{ name: 'Melodieyy-', id: 33526381 }], banner: 'http://swooo.sh/FLUV6w.png' },
			{ name: 'Sandri Showdown', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2136853', hosts: [{ name: 'cedru', id: 10162611 }], banner: 'https://sundei.ee/tournaments/cedru-showdown.webp' }
		]
	},
	{
		year: '2025/2026',
		events: [
			{ name: 'Latvian osu! LAN Tournament', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2137587', hosts: [{ name: 'Joyy', id: 14084526 }], banner: 'https://sundei.ee/tournaments/lolt2026.webp' },
			{ name: 'Nordic & Baltic Duo Tournament', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2151572', hosts: [{ name: 'Laurus', id: 20373027 }, { name: 'nik', id: 10077264 }], banner: 'https://sundei.ee/tournaments/nbd2025.png' },
			{ name: 'osu! 6 digit Tournament', role: 'referee/commentator', link: 'https://osu.ppy.sh/community/forums/topics/2139437', hosts: [{ name: 'FrenchFemboy', id: 15875416 }, { name: 'Scream10', id: 16131822 }, { name: 'Ninbsa', id: 20024996 }], banner: 'https://sundei.ee/tournaments/6digwc.png' }
		]
	},
	{
		year: '2026',
		events: [
			{ name: '5EC Minor League', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2160276', hosts: [{ name: 'jojo_flower', id: 28236847 }, { name: 'Neko4ka', id: 36036411 }], banner: 'https://sundei.ee/tournaments/5ecml.jpg'},
			{ name: 'Battle of The Box 2026', role: 'referee/commentator', link: 'https://osu.ppy.sh/community/forums/topics/2178368?n=1', hosts: [{ name: 'xootynator', id: 3717598 }, { name: 'Fulserish', id: 14252162 }], banner: 'https://sundei.ee/tournaments/Battle_of_the_Box_2026_Waifu_Cup.png', badge: 'https://sundei.ee/badges/botb2026-winner.png' },
			{ name: 'Fun Awesome Relax Tournament', role: 'referee/commentator/playtester', link: 'https://osu.ppy.sh/community/forums/topics/2166712', hosts: [{ name: 'birbisc', id: 30403970 }], banner: 'https://sundei.ee/tournaments/fart2026.png'},
			{ name: 'The Oceanic Cup', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2179025?n=1', hosts: [{ name: 'mrekk', id: 7562902 }, { name: 'Gala', id: 3385634 }], banner: 'https://sundei.ee/tournaments/oceanic-cup.png'},
			{ name: 'XTALotl\'s Skillcap Showdown', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2186485?n=1', hosts: [{ name: '-Axolotl', id: 12995368 }, { name: 'u__u', id: 13139356 }], banner: 'https://sundei.ee/tournaments/skillcap.png'},
			{ name: 'Lebron James Suiji', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2195943?n=1', hosts: [{ name: 'townes', id: 21063408 }, { name: 'MR JEFFERY', id: 16036374 }, { name: 'arekk', id: 16085078 }], banner: 'https://sundei.ee/tournaments/lebron-suiji.png', badge: 'https://sundei.ee/badges/lebron-badge.png' },
			{ name: 'Fin\'s All Mode Event', role: 'referee/commentator', link: 'https://osu.ppy.sh/community/forums/topics/2192013?n=1', hosts: [{ name: 'fhz', id: 13660273 }, { name: 'ZeroKungz', id: 23155757 }], banner: 'https://sundei.ee/tournaments/fame.png'},
			{ name: 'Sweden Cup 2026', role: 'streamer', link: 'https://osu.ppy.sh/community/forums/topics/2198246?n=1', hosts: [{ name: 'Geometryville', id: 18272338 }], banner: 'https://sundei.ee/tournaments/sweden-cup-26.png',  badge: 'https://sundei.ee/badges/sc26-winner.png'},
			{ name: 'Gus Cup 2', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2201090?n=1', hosts: [{ name: 'Woey', id: 3792472 }, { name: 'Nopekjk', id: 4585186 }], banner: 'https://sundei.ee/tournaments/gus2-banner.jpg'},
			{ name: 'Suomen Alueellinen Turnaus', role: 'streamer/referee', link: 'https://osu.ppy.sh/community/forums/topics/2198883?n=1', hosts: [{ name: 'Nikva', id: 21353706 }], banner: 'https://sundei.ee/tournaments/sat2026.png'},
			{ name: 'Shuffle Squad Rumble', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2190446?n=1', hosts: [{ name: 'Molidis', id: 16813846 }, { name: 'Tey', id: 18352115 }, { name: 'Helyana', id: 7921863 }], banner: 'https://sundei.ee/tournaments/ssr-suiji.png'},
			{ name: 'Royal Danish osu! Cup 2026', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2217906?n=1', hosts: [{ name: 'Isita', id: 13973026 }, { name: 'jas_', id: 16681798 }], banner: 'https://sundei.ee/tournaments/danish-osu-2026.png'}, 
			{ name: 'Canadian Draft Cup 2026', role: 'referee/streamer', link: 'https://osu.ppy.sh/community/forums/topics/2217995?n=1', hosts: [{ name: 'LumenLogic', id: 8171404 }], banner: 'https://sundei.ee/tournaments/cdc2026-banner.png'}, 
			{ name: 'Rektygon\'s United States Tournament 2', role: 'referee/streamer', link: 'https://osu.ppy.sh/community/forums/topics/2221491?n=1', hosts: [{ name: 'rektygon', id: 7813296 }], banner: 'https://sundei.ee/tournaments/rust2-banner.png'}, 
			{ name: 'UNICON 2026 osu! Tournament', role: 'referee/streamer/developer', link: 'https://osu.ppy.sh/community/forums/topics/2214930?n=1', hosts: [{ name: 'Joyy', id: 14084526 }, { name: 'waywern2012', id: 5870453 }], banner: 'https://sundei.ee/tournaments/unicon2026-summer.png' },
			{ name: 'All-American Auction House 5', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2210768?n=1', hosts: [{ name: 'ROB_', id: 12455868 }, { name: 'Pezz', id: 10651106 }], banner: 'https://sundei.ee/tournaments/AAAH5.png' },
			{ name: 'Pringle Purrfect Cup 2', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2211583?n=1', hosts: [{ name: 'pingle enjoyer', id: 32558109 }, { name: 'D I O', id: 3958619 }], banner: 'https://sundei.ee/tournaments/ppc2-banner.png'}, 
			{ name: 'centaurea x TipiLAN 2026', role: 'referee/streamer/LAN helper', link: 'https://centaurea.ee/events/dc2c0566-49e0-4089-9443-ac2b1c52f3bb', hosts: [{ name: 'Slay', id: 7093124 }, { name: 'cedru', id: 10162611 }, { name: 'uwuchaoz', id: 14624925 }, { name: 'MEGAHELLO', id: 11155994 }], banner: 'https://sundei.ee/tournaments/centaurea-tipilan.png' },
			{ name: 'estonian duo cup 2026', role: 'host/referee/streamer', link: 'https://centaurea.ee/events/1564f3e6-2d2b-45d6-8990-a9e0b2a75588', hosts: [{ name: 'sodanator', id: 28827755 } ], banner: 'https://sundei.ee/tournaments/edc.png' },
			{ name: 'National Dutch Championship 2026', role: 'referee/streamer', link: 'https://osu.ppy.sh/community/forums/topics/2232832?n=1', hosts: [{ name: 'Lilily', id: 6502403 }], banner: 'https://sundei.ee/tournaments/NDC2026.png' },
		]
	}
];
