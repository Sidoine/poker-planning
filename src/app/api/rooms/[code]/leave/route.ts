import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { findParticipant, findRoom, PARTICIPANT_HEADER } from "@/lib/room-service";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const room = await findRoom(code);
  if (!room) {
    return NextResponse.json({ ok: false, error: "Salle introuvable" }, { status: 404 });
  }
  const token = request.headers.get(PARTICIPANT_HEADER);
  if (token) {
    const participant = await findParticipant(room.id, token);
    if (participant) {
      await db.delete(participants).where(eq(participants.id, participant.id));
    }
  }
  return NextResponse.json({ ok: true });
}
