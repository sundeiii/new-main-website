// Set by the layout once the first page has been shown. Entrance animations check it, so they
// play when you arrive from another page but not on a refresh, where the content is already
// on screen from the server and would otherwise blink out and fade back in.
export const app = { hydrated: false };
