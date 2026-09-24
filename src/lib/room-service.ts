import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { participants, rooms, type Participant, type Room } from "@/db/schema";
import {
  computeStats,
  type DeckKey,
  type ParticipantView,
  type RoomView,
} from "@/lib/poker";

export const PARTICIPANT_HEADER = "x-participant-token";
export const OWNER_HEADER = "x-owner-token";

export function tokenFromRequest(request: Request, header: string) {
  const raw =
    request.headers.get(header) ??
    new URL(request.url).searchParams.get(header.toLowerCase());
  return raw && raw.length > 0 ? raw : null;
}

export async function findRoom(code: string) {
  const rows = await db
    .select()
    .from(rooms)
    .where(eq(rooms.code, code.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function listParticipants(roomId: number) {
  return db
    .select()
    .from(participants)
    .where(eq(participants.roomId, roomId))
    .orderBy(asc(participants.id));
}

export function buildRoomView(
  room: Room,
  rows: Participant[],
  viewerToken: string | null,
  ownerToken: string | null,
): RoomView {
  const participantsView: ParticipantView[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    vote: p.vote,
    isCreator: p.isCreator,
    isOwner:
      (viewerToken !== null && p.token === viewerToken) ||
      (ownerToken !== null && ownerToken === room.ownerToken && p.isCreator),
  }));

  return {
    code: room.code,
    name: room.name,
    storyTitle: room.storyTitle,
    storyUrl: room.storyUrl,
    deck: room.deck as DeckKey,
    revealed: room.revealed,
    round: room.round,
    createdAt: room.createdAt.toISOString(),
    participants: participantsView,
    stats: computeStats(participantsView, room.deck as DeckKey),
  };
}

export async function getRoomView(
  code: string,
  viewerToken: string | null = null,
  ownerToken: string | null = null,
): Promise<RoomView | null> {
  const room = await findRoom(code);
  if (!room) return null;
  const rows = await listParticipants(room.id);
  return buildRoomView(room, rows, viewerToken, ownerToken);
}

export async function touchRoom(roomId: number) {
  await db
    .update(rooms)
    .set({ updatedAt: new Date() })
    .where(eq(rooms.id, roomId));
}

export async function touchParticipant(participantId: number) {
  await db
    .update(participants)
    .set({ lastSeenAt: new Date() })
    .where(eq(participants.id, participantId));
}

export async function findParticipant(roomId: number, token: string) {
  const rows = await db
    .select()
    .from(participants)
    .where(and(eq(participants.roomId, roomId), eq(participants.token, token)))
    .limit(1);
  return rows[0] ?? null;
}

export function isRoomOwner(room: Room, ownerToken: string | null) {
  return ownerToken !== null && ownerToken === room.ownerToken;
}
