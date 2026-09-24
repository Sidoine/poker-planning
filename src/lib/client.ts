import { ANIMALS, type RoomView } from "@/lib/poker";

export type Identity = { name: string; avatar: string };
export type RoomIdentity = { participantToken: string; ownerToken?: string };
export type RecentRoom = { code: string; name: string; seenAt: number };

const IDENTITY_KEY = "pokerzoo:identity";
const RECENT_KEY = "pokerzoo:recent";
const roomKey = (code: string) => `pokerzoo:room:${code}`;

function safeGet(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function randomAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
}

export function loadIdentity(): Identity {
  const raw = safeGet(IDENTITY_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Identity>;
      if (parsed && typeof parsed.name === "string") {
        return {
          name: parsed.name,
          avatar: parsed.avatar && ANIMALS.includes(parsed.avatar) ? parsed.avatar : randomAnimal(),
        };
      }
    } catch {
      /* ignore */
    }
  }
  return { name: "", avatar: randomAnimal() };
}

export function saveIdentity(identity: Identity) {
  safeSet(IDENTITY_KEY, JSON.stringify(identity));
}

export function loadRoomIdentity(code: string): RoomIdentity | null {
  const raw = safeGet(roomKey(code));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RoomIdentity>;
    if (parsed && typeof parsed.participantToken === "string") {
      return {
        participantToken: parsed.participantToken,
        ownerToken: typeof parsed.ownerToken === "string" ? parsed.ownerToken : undefined,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveRoomIdentity(code: string, identity: RoomIdentity) {
  const current = loadRoomIdentity(code);
  safeSet(
    roomKey(code),
    JSON.stringify({
      participantToken: identity.participantToken || current?.participantToken,
      ownerToken: identity.ownerToken ?? current?.ownerToken,
    }),
  );
}

export function clearRoomIdentity(code: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(roomKey(code));
  } catch {
    /* ignore */
  }
}

export function rememberRoom(code: string, name: string) {
  const raw = safeGet(RECENT_KEY);
  let list: RecentRoom[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw) as RecentRoom[];
    } catch {
      list = [];
    }
  }
  const next = [
    { code, name, seenAt: Date.now() },
    ...list.filter((r) => r.code !== code),
  ].slice(0, 5);
  safeSet(RECENT_KEY, JSON.stringify(next));
}

export function loadRecentRooms(): RecentRoom[] {
  const raw = safeGet(RECENT_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RecentRoom[];
  } catch {
    return [];
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  participantToken?: string | null;
  ownerToken?: string | null;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.participantToken) headers["x-participant-token"] = options.participantToken;
  if (options.ownerToken) headers["x-owner-token"] = options.ownerToken;
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Une erreur est survenue");
  }
  return data;
}

export type RoomResponse = {
  ok: boolean;
  room: RoomView | null;
  deck?: string[];
  participantToken?: string;
  ownerToken?: string;
};
