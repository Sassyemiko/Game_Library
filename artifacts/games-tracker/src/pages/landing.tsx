import { SignInButton, SignUpButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Gamepad2, Sparkles, Trophy, Library, ArrowRight, Eye } from "lucide-react";
import { setGuestMode } from "@/lib/guest-mode";
import { PasswordModal } from "@/components/password-modal";
import { useState } from "react";

export default function Landing() {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const handlePasswordSubmit = (password: string) => {
    const previewPwd = import.meta.env.VITE_PREVIEW_PASSWORD as string | undefined;
    if (previewPwd && password !== previewPwd) {
      setPasswordModalOpen(false);
      return;
    }
    setPasswordModalOpen(false);
    setGuestMode(true);
    window.location.href = import.meta.env.BASE_URL;
  };

  const enterGuest = () => {
    const previewPwd = import.meta.env.VITE_PREVIEW_PASSWORD as string | undefined;
    if (previewPwd) {
      setPasswordModalOpen(true);
      return;
    }
    setGuestMode(true);
    window.location.href = import.meta.env.BASE_URL;
  };
  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <h1 className="font-sans font-bold text-xl tracking-tight text-glow">Nexus</h1>
        </div>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <Button variant="ghost" className="text-foreground hover:bg-white/5">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              Get started
            </Button>
          </SignUpButton>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 md:px-10 py-12 z-10">
        <div className="max-w-4xl w-full text-center space-y-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Your personal game vault
            </div>
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-glow leading-[1.05]">
              Track every game.<br />
              <span className="bg-gradient-to-r from-primary via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Remember every story.
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Log what you've completed, what you're playing, and what you've put on hold — across every console.
              Sign in with your email to sync your library to Nexus.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <SignUpButton mode="modal">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] text-base">
                Sync your email to start <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5 text-base">
                I already have an account
              </Button>
            </SignInButton>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={enterGuest}
              className="text-muted-foreground hover:text-primary hover:bg-white/5 text-base"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview without signing in
            </Button>
          </div>

          {/* Feature row */}
          <div className="grid md:grid-cols-3 gap-4 pt-12">
            {[
              { icon: Library, title: "Unified library", desc: "Every platform, every status, in one dashboard." },
              { icon: Trophy, title: "Track progress", desc: "Log hours, ratings, dates, and personal notes." },
              { icon: Sparkles, title: "Auto cover art", desc: "Type a title — we fetch the cover for you." },
            ].map(f => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm p-6 text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="px-6 md:px-10 py-6 text-center text-xs font-mono uppercase tracking-widest text-muted-foreground z-10">
        Nexus · Personal Games Tracker
      </footer>

      <PasswordModal
        isOpen={passwordModalOpen}
        onSubmit={handlePasswordSubmit}
        onCancel={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}
