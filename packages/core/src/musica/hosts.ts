import type { Provedor } from "./types";

const HOSTS: ReadonlyMap<string, Provedor> = new Map([
  ["open.spotify.com", "spotify"],
  ["music.youtube.com", "youtube-music"],
  ["www.youtube.com", "youtube"],
  ["youtube.com", "youtube"],
  ["m.youtube.com", "youtube"],
  ["youtu.be", "youtube"],
  ["music.apple.com", "apple-music"],
  ["www.deezer.com", "deezer"],
  ["deezer.com", "deezer"],
] as const);

export const HOSTS_ACEITOS: readonly string[] = [...HOSTS.keys()];

export function provedorDoHost(host: string): Provedor | undefined {
  return HOSTS.get(host);
}
