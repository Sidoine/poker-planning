import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDeck } from "@/lib/poker";
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
  const token = request.headers.get(PARTICIPANT_HEADER);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Joueur inconnu" }, { status: 401 });
  }
  const participant = await findParticipant(room.id, token);
  if (!participant) {
    return NextResponse.json({ ok: false, error: "Joueur inconnu" }, { status: 401 });
  }

  let body: { vote?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const cards = getDeck(room.deck).cards as readonly string[];
  const raw = body.vote;
  let vote: string | null = null;
  if (typeof raw === "string" && cards.includes(raw)) vote = raw;

  await db
    .update(participants)
    .set({ vote, lastSeenAt: new Date() })
    .where(eq(participants.id, participant.id));

  await touchRoom(room.id);
  const rows = await listParticipants(room.id);
  const fresh = await findRoom(code);

  return NextResponse.json({
    ok: true,
    room: fresh ? buildRoomView(fresh, rows, token, null) : null,
    deck: cards,
  });
}
