import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { DECK_KEYS, getDeck } from "@/lib/poker";
import {
  findRoom,
  getRoomView,
  isRoomOwner,
  listParticipants,
  OWNER_HEADER,
  PARTICIPANT_HEADER,
  touchRoom,
  buildRoomView,
} from "@/lib/room-service";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const viewerToken = request.headers.get(PARTICIPANT_HEADER);
  const ownerToken = request.headers.get(OWNER_HEADER);
  const view = await getRoomView(code, viewerToken, ownerToken);
  if (!view) {
    return NextResponse.json({ ok: false, error: "Salle introuvable" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    room: view,
    deck: getDeck(view.deck).cards,
  });
}

type PatchBody = {
  name?: unknown;
  storyTitle?: unknown;
  storyUrl?: unknown;
  deck?: unknown;
};

export async function PATCH(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const room = await findRoom(code);
  if (!room) {
    return NextResponse.json({ ok: false, error: "Salle introuvable" }, { status: 404 });
  }
  const ownerToken = request.headers.get(OWNER_HEADER);
  if (!isRoomOwner(room, ownerToken)) {
    return NextResponse.json(
      { ok: false, error: "Seul le créateur de la salle peut modifier la story" },
      { status: 403 },
    );
  }

  let body: PatchBody = {};
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    body = {};
  }

  const patch: Partial<typeof rooms.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 60) || room.name;
  if (typeof body.storyTitle === "string") patch.storyTitle = body.storyTitle.trim().slice(0, 140);
  if (typeof body.storyUrl === "string") patch.storyUrl = body.storyUrl.trim().slice(0, 500);
  if (typeof body.deck === "string" && DECK_KEYS.includes(body.deck as (typeof DECK_KEYS)[number])) {
    patch.deck = body.deck;
  }

  await db.update(rooms).set(patch).where(eq(rooms.id, room.id));
  await touchRoom(room.id);

  const updated = await findRoom(code);
  const rows = await listParticipants(room.id);
  const viewerToken = request.headers.get(PARTICIPANT_HEADER);
  return NextResponse.json({
    ok: true,
    room: updated ? buildRoomView(updated, rows, viewerToken, ownerToken) : null,
    deck: getDeck(updated?.deck ?? "fibonacci").cards,
  });
}
