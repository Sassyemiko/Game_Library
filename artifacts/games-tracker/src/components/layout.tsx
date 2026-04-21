import { Link, useLocation } from "wouter";
import { Gamepad2, Home, Trophy, Play, PauseOctagon, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const initial = (user?.firstName || email || "U").trim().charAt(0).toUpperCase();

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/completed", icon: Trophy, label: "Completed" },
    { href: "/ongoing", icon: Play, label: "Ongoing" },
    { href: "/halted", icon: PauseOctagon, label: "Halted" },
    { href: "/recommended", icon: Sparkles, label: "Recommended" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row relative">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card/50 backdrop-blur-md px-4 py-6 z-10 relative">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <h1 className="font-sans font-bold text-xl tracking-tight text-glow">Nexus</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="block">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  location === item.href
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-primary-foreground/10"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="pt-4 border-t border-border/50 space-y-3">
          {email && (
            <div className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user?.firstName || "Player"}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground px-2">
              Theme
            </span>
            <ThemeToggle />
          </div>
          <SignOutButton redirectUrl={import.meta.env.BASE_URL}>
            <Button variant="outline" size="sm" className="w-full border-white/10 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          </SignOutButton>
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden flex items-center justify-between border-b bg-card/80 backdrop-blur-md px-4 py-3 sticky top-0 z-50">
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h1 className="font-sans font-bold text-lg tracking-tight">Nexus</h1>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton redirectUrl={import.meta.env.BASE_URL}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </SignOutButton>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-x-hidden relative">
        <div className="flex-1 p-4 md:p-8 z-10">
          {children}
        </div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden border-t bg-card/80 backdrop-blur-md sticky bottom-0 z-50 px-6 py-3 flex items-center justify-around">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="block">
            <div
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                location === item.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
