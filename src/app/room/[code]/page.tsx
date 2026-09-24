import Link from "next/link";
import { getRoomView } from "@/lib/room-service";
import RoomClient from "@/components/RoomClient";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.toUpperCase();

  let initialRoom = null;
  try {
    initialRoom = await getRoomView(normalized);
  } catch {
    initialRoom = null;
  }

  if (!initialRoom) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="zoo-card zoo-pop rounded-[2rem] border-4 border-white bg-white/90 p-10">
          <div className="mb-4 text-6xl">🕵️‍♀️🐾</div>
          <h1 className="text-3xl font-extrabold text-[#4b3168]">Salle introuvable</h1>
          <p className="mt-3 font-semibold text-[#7a5c9e]">
            La salle <span className="font-extrabold">{normalized}</span> n&apos;existe pas ou a
            été emportée par le vent de la savane.
          </p>
          <Link
            href="/"
            className="zoo-btn mt-6 inline-block rounded-2xl bg-gradient-to-r from-[#ffb26b] to-[#ff8fab] px-6 py-3 font-extrabold text-white"
          >
            🏕️ Retour à l&apos;entrée du zoo
          </Link>
        </div>
      </main>
    );
  }

  return <RoomClient code={initialRoom.code} initialRoom={initialRoom} />;
}
