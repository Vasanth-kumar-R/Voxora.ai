import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxora AI — Autonomous Voice Sales Platform",
  description: "Every conversation. More sales intelligence. Real-time AI voice sales with live transcription, post-call analysis, and full pipeline management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
