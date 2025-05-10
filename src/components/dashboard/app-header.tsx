import { ShieldCheck } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <ShieldCheck className="h-8 w-8 mr-2 text-primary" />
          <h1 className="text-2xl font-bold text-primary">LogLens</h1>
        </div>
        {/* Future: Add theme toggle, user menu, etc. */}
      </div>
    </header>
  );
}
