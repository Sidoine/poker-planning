import Image from "next/image";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { participants, rooms } from "@/db/schema";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

async function loadStats() {
  try {
    const [roomRow] = await db.select({ value: sql<number>`count(*)::int` }).from(rooms);
    const [playerRow] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(participants);
    const [voteRow] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(participants)
      .where(sql`${participants.vote} is not null`);
    return {
      rooms: roomRow?.value ?? 0,
      players: playerRow?.value ?? 0,
      votes: voteRow?.value ?? 0,
    };
  } catch {
    return { rooms: 0, players: 0, votes: 0 };
  }
}

export default async function HomePage() {
  const stats = await loadStats();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-10 text-center">
        <div className="mb-3 flex items-center justify-center gap-2 text-5xl sm:text-6xl">
          <span className="zoo-float">🦊</span>
          <span className="zoo-bounce">🐼</span>
          <span className="zoo-float">🐨</span>
          <span className="zoo-bounce">🦄</span>
          <span className="zoo-float">🐸</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#4b3168] sm:text-6xl">
          Poker Zoo
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg font-semibold text-[#7a5c9e]">
          Le planning poker le plus mignon de la savane. Crée ta salle, partage le lien de la
          story, et vote avec tes compagnons à poils, à plumes ou à écailles 🐾
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-[#6b4f8f]">
          <span className="rounded-full border-4 border-white bg-white/80 px-4 py-2 shadow-sm">
            🏕️ {stats.rooms} salles créées
          </span>
          <span className="rounded-full border-4 border-white bg-white/80 px-4 py-2 shadow-sm">
            🐾 {stats.players} animaux inscrits
          </span>
          <span className="rounded-full border-4 border-white bg-white/80 px-4 py-2 shadow-sm">
            🃏 {stats.votes} cartes jouées
          </span>
        </div>
      </header>

      <div className="zoo-card zoo-pop mb-10 overflow-hidden rounded-[2.5rem] border-4 border-white bg-white/70">
        <Image
          src="/images/hero.png"
          alt="Des animaux mignons qui font du planning poker autour d'une table"
          width={1792}
          height={1008}
          priority
          className="h-56 w-full object-cover sm:h-72 lg:h-80"
        />
      </div>

      <HomeClient />
    </main>
  );
}
