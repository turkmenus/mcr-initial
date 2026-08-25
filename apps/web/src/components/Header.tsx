"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRealtime } from "@/context/RealtimeContext";
import {
  Tv,
  SlidersHorizontal,
  ScrollText,
  Film,
  CloudSun,
  ExternalLink,
  Server,
  Radio,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { connected, casparStatus, activeCgLayers } = useRealtime();
  const [timeStr, setTimeStr] = useState("");
  const [utcStr, setUtcStr] = useState("");

  const hasActiveGraphics = Object.keys(activeCgLayers).length > 0;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("tr-TR", { hour12: false }));
      setUtcStr(now.toISOString().substring(11, 19) + " UTC");
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { href: "/control", label: "Canlı Grafik", icon: SlidersHorizontal },
    { href: "/ticker", label: "Ticker Operatörü", icon: ScrollText },
    { href: "/editor", label: "Kurgu Editörü", icon: Film },
    { href: "/weather", label: "Meteoroloji", icon: CloudSun },
  ];

  return (
    <header className="h-16 bg-card/90 backdrop-blur-md border-b border-border px-6 flex items-center justify-between select-none z-50 sticky top-0">
      {/* Brand & Tally Status */}
      <div className="flex items-center gap-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/40 group-hover:scale-105 transition-transform duration-200">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider text-white">MCR</span>
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                PROD
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono leading-none">Media Control Room</p>
          </div>
        </Link>

        {/* Tally Light Indicator */}
        <Badge
          variant={hasActiveGraphics ? "tallyOnAir" : "tallyStandby"}
          className="text-xs px-3 py-1 font-extrabold flex items-center gap-2"
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              hasActiveGraphics ? "bg-red-500 animate-ping" : "bg-emerald-400"
            )}
          />
          {hasActiveGraphics ? "ON AIR (YAYINDA)" : "STANDBY (HAZIR)"}
        </Badge>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-secondary/70 p-1 rounded-xl border border-border/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: isActive ? "default" : "ghost", size: "sm" }),
                "gap-2 font-bold text-xs h-9",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Status & Clocks */}
      <div className="flex items-center gap-5">
        {/* CasparCG Status Badge */}
        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-secondary/80 border border-border">
          <Server className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">CasparCG:</span>
          <span
            className={cn(
              "font-bold",
              casparStatus === "CONNECTED"
                ? "text-emerald-400"
                : casparStatus === "MOCK"
                ? "text-amber-400"
                : "text-destructive"
            )}
          >
            {casparStatus}
          </span>
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              connected ? "bg-emerald-500" : "bg-destructive animate-pulse"
            )}
            title={connected ? "WS Hub Bağlı" : "WS Hub Bağlantısı Kesildi"}
          />
        </div>

        {/* Studio Clocks */}
        <div className="text-right font-mono" suppressHydrationWarning>
          <div className="text-lg font-black text-white tracking-widest leading-none" suppressHydrationWarning>
            {timeStr || "00:00:00"}
          </div>
          <div className="text-[10px] text-muted-foreground tracking-wider mt-0.5" suppressHydrationWarning>
            {utcStr || "00:00:00 UTC"}
          </div>
        </div>

        {/* Output Popout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open("/output", "MCROutputWindow", "width=1920,height=1080")}
          className="gap-2 text-xs font-bold text-sky-400 border-sky-500/30 hover:border-sky-400 hover:bg-sky-950/40"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Çıkış Penceresi</span>
        </Button>
      </div>
    </header>
  );
};
