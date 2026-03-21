import './globals.css'; // <-- THIS IS THE MAGIC LINE THAT FIXES EVERYTHING!

export const metadata = {
  title: 'AI Planning Agent | ForceEqual',
  description: 'Multi-agent system for structured reports',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30">
        <div className="relative flex min-h-screen flex-col">
          {/* Subtle background glow */}
          <div className="absolute inset-0 z-[-1] min-h-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
          
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl transition-all">
            <div className="container flex h-16 items-center">
              <div className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity cursor-pointer">
                <div className="size-8 rounded-lg bg-primary/10 flex justify-center items-center text-primary ring-1 ring-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                </div>
                ForceEqual<span className="text-primary tracking-tighter ml-[-2px]">.AI</span>
              </div>
            </div>
          </header>
          
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}