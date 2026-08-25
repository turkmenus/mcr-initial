import type { Metadata } from "next";
import "./globals.css";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "MCR — Media Control Room",
  description: "Haber odası için entegre broadcast grafik kontrolü, kurgu timeline ve hava durumu stüdyosu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-[#080C14] text-slate-100 min-h-screen flex flex-col antialiased">
        <RealtimeProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
        </RealtimeProvider>
      </body>
    </html>
  );
}
