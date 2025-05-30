import Link from 'next/link';
import { ShieldCheck, Settings, Binary } from 'lucide-react'; // Added Binary for PCAP icon
import { Button } from '@/components/ui/button'; 

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center mr-4">
          <ShieldCheck className="h-8 w-8 mr-2 text-primary" />
          <h1 className="text-2xl font-bold text-primary">LogLens</h1>
        </Link>
        
        <nav className="flex items-center gap-2">
           <Button variant="outline" asChild>
              <Link href="/deploy-agent">
                <Settings className="mr-2 h-4 w-4" />
                Deploy Agent
              </Link>
           </Button>
           <Button variant="outline" asChild>
              <Link href="/pcap-visualizer">
                <Binary className="mr-2 h-4 w-4" />
                PCAP Visualizer
              </Link>
           </Button>
           {/* Future: Add theme toggle, user menu, etc. */}
        </nav>
      </div>
    </header>
  );
}
