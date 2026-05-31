"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map as MapIcon, MessageCircle, WifiOff } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex justify-around items-center px-4 z-50">
      <Link href="/" className={`flex flex-col items-center p-2 ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
        <Home size={24} />
        <span className="text-[10px] mt-1">SOS</span>
      </Link>
      <Link href="/map" className={`flex flex-col items-center p-2 ${pathname === '/map' ? 'text-primary' : 'text-muted-foreground'}`}>
        <MapIcon size={24} />
        <span className="text-[10px] mt-1">Map</span>
      </Link>
      <Link href="/chat" className={`flex flex-col items-center p-2 ${pathname === '/chat' ? 'text-primary' : 'text-muted-foreground'}`}>
        <MessageCircle size={24} />
        <span className="text-[10px] mt-1">Chat</span>
      </Link>
      <Link href="/offline" className={`flex flex-col items-center p-2 ${pathname === '/offline' ? 'text-primary' : 'text-muted-foreground'}`}>
        <WifiOff size={24} />
        <span className="text-[10px] mt-1">Offline</span>
      </Link>
    </nav>
  );
}
