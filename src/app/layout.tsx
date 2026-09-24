import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Poker Zoo 🐾 Planning Poker mignon",
  description:
    "Application de Poker Planning multi-utilisateurs toute mignonne : crée une salle, partage le lien de la story et vote avec les animaux !",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body
        className={`${baloo.variable} ${nunito.variable} zoo-bg antialiased`}
      >
        <div className="zoo-paws min-h-screen w-full">{children}</div>
      </body>
    </html>
  );
}
