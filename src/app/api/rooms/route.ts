import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { participants, rooms } from "@/db/schema";
import { DECK_KEYS, friendlyRoomCode, getDeck, publicToken } from "@/lib/poker";
import { buildRoomView, listParticipants } from "@/lib/room-service";

type CreateBody = {
  name?: unknown;
  creatorName?: unknown;
  avatar?: unknown;
  storyTitle?: unknown;
  storyUrl?: unknown;
  deck?: unknown;
  ownerToken?: unknown;
};

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function POST(request: Request) {
  let body: CreateBody = {};
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    body = {};
  }

  const name = str(body.name).slice(0, 60) || "Salle des animaux";
  const creatorName = str(body.creatorName).slice(0, 24) || "Chef de meute";
  const avatar = str(body.avatar) || "🦊";
  const storyTitle = str(body.storyTitle).slice(0, 140);
  const storyUrl = str(body.storyUrl).slice(0, 500);
  const deckRaw = str(body.deck, "fibonacci");
  const deck = DECK_KEYS.includes(deckRaw as (typeof DECK_KEYS)[number])
    ? (deckRaw as (typeof DECK_KEYS)[number])
    : "fibonacci";
  const ownerToken = str(body.ownerToken) || publicToken();

  let code = friendlyRoomCode();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const existing = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.code, code))
      .limit(1);
    if (existing.length === 0) break;
    code = friendlyRoomCode();
  }

  const [room] = await db
    .insert(rooms)
    .values({ code, name, storyTitle, storyUrl, deck, ownerToken })
    .returning();

  const participantToken = publicToken();
  await db.insert(participants).values({
    roomId: room.id,
    token: participantToken,
    name: creatorName,
    avatar,
    isCreator: true,
  });

  const rows = await listParticipants(room.id);

  return NextResponse.json(
    {
      ok: true,
      code: room.code,
      participantToken,
      ownerToken: room.ownerToken,
      room: buildRoomView(room, rows, participantToken, ownerToken),
      deck: getDeck(deck).cards,
    },
    { status: 201 },
  );
}
