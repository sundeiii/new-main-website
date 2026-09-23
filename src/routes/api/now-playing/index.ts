// src/routes/api/now-playing/+server.ts
import type { RequestHandler } from './$types';
import { getSpotifyAccessToken } from '$lib/server/spotify';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

interface NowPlayingResponse {
  isPlayingNow: boolean;
  isPaused: boolean;
  progressMs: number;
  track: SpotifyApi.TrackObjectFull | null;
  // When Spotify was asked, so clients can correct progressMs for time spent in the cache.
  fetchedAt: number;
}

export const GET: RequestHandler = async ({ fetch, platform }) => {
  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
  if (!SPOTIFY_CLIENT_ID) {
    return new Response('Missing Spotify client ID', { status: 500 });
  }

  // Every visitor on the home page polls this every 5 seconds, so let Vercel's cache share one
  // Spotify call between everyone for a few seconds instead of hitting Spotify per visitor.
  const cacheHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=0, s-maxage=4, stale-while-revalidate=4'
  };

  const base: NowPlayingResponse = {
    isPlayingNow: false,
    isPaused: false,
    progressMs: 0,
    track: null,
    fetchedAt: Date.now()
  };

  try {
    const accessToken = await getSpotifyAccessToken({ fetch, platform });
    const api = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, accessToken);

    // this is the ts-sdk wrapper for /me/player
    const [playback, { isHidden, keep }] = await Promise.all([api.player.getPlaybackState(), hiddenArtistFilter()]);

    // Hidden artists are treated as "not playing", so it falls back to the last other track.
    if (playback && playback.item && playback.currently_playing_type === 'track' && !isHidden(playback.item)) {
      return new Response(
        JSON.stringify({
          ...base,
          isPlayingNow: true,
          isPaused: !playback.is_playing,
          progressMs: playback.progress_ms ?? 0,
          track: playback.item as SpotifyApi.TrackObjectFull
        }),
        { headers: cacheHeaders }
      );
    }

    // fallback to your existing recent-tracks call
    const recentlyPlayed = await api.player.getRecentlyPlayedTracks(20); // [web:33]
    const item = recentlyPlayed.items.find(keep);
    if (item?.track) {
      return new Response(
        JSON.stringify({
          ...base,
          track: item.track as SpotifyApi.TrackObjectFull
        }),
        { headers: cacheHeaders }
      );
    }

    return new Response(JSON.stringify(base), { headers: cacheHeaders });
  } catch (error) {
    console.error('Failed to fetch now playing:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch now playing' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
