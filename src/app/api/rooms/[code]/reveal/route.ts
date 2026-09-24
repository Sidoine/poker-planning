import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  buildRoomView,
  findRoom,
  isRoomOwner,
  listParticipants,
  OWNER_HEADER,
  PARTICIPANT_HEADER,
} from "@/lib/room-service";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const room = await findRoom(code);
  if (!room) {
    return NextResponse.json({ ok: false, error: "Salle introuvable" }, { status: 404 });
  }
  const ownerToken = request.headers.get(OWNER_HEADER);
  if (!isRoomOwner(room, ownerToken)) {
    return NextResponse.json(
      { ok: false, error: "Seul le créateur peut dévoiler les cartes" },
      { status: 403 },
    );
  }

  let body: { revealed?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const revealed = body.revealed === undefined ? !room.revealed : Boolean(body.revealed);

  await db
    .update(rooms)
    .set({ revealed, updatedAt: new Date() })
    .where(eq(rooms.id, room.id));

  const fresh = await findRoom(code);
  const rows = await listParticipants(room.id);
  const viewerToken = request.headers.get(PARTICIPANT_HEADER);

  return NextResponse.json({
    ok: true,
    room: fresh ? buildRoomView(fresh, rows, viewerToken, ownerToken) : null,
  });
}
