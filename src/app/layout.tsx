import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Simplon Maghreb — Gestion des Formations',
  description: 'Système d\'information de gestion des campus, projets de formation, cohortes et apprenants pour Simplon Maghreb.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
