import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ANIMALS, publicToken } from "@/lib/poker";
import {
  buildRoomView,
  findParticipant,
  findRoom,
  listParticipants,
  PARTICIPANT_HEADER,
  touchRoom,
} from "@/lib/room-service";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const room = await findRoom(code);
  if (!room) {
    return NextResponse.json({ ok: false, error: "Salle introuvable" }, { status: 404 });
  }

  let body: { name?: unknown; avatar?: unknown; token?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const name =
    (typeof body.name === "string" ? body.name.trim() : "").slice(0, 24) || "Petit curieux";
  const avatar =
    (typeof body.avatar === "string" && ANIMALS.includes(body.avatar) ? body.avatar : "") ||
    ANIMALS[Math.floor(Math.random() * ANIMALS.length)];

  const headerToken = request.headers.get(PARTICIPANT_HEADER);
  const bodyToken =
    typeof body.token === "string" && body.token.length > 0 ? body.token : null;
  const token =
    (headerToken && headerToken.length > 0 ? headerToken : null) ?? bodyToken ?? publicToken();

  const existing = await findParticipant(room.id, token);
  if (existing) {
    await db
      .update(participants)
      .set({ name, avatar, lastSeenAt: new Date() })
      .where(eq(participants.id, existing.id));
  } else {
    await db.insert(participants).values({
      roomId: room.id,
      token,
      name,
      avatar,
      isCreator: false,
    });
  }

  await touchRoom(room.id);
  const rows = await listParticipants(room.id);
  const fresh = await findRoom(code);

  return NextResponse.json({
    ok: true,
    participantToken: token,
    room: fresh ? buildRoomView(fresh, rows, token, null) : null,
  });
}
