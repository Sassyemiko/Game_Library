import { Game, GameStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Gamepad2, Star, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface GameCardProps {
  game: Game;
}

const statusColors: Record<GameStatus, { bg: string; text: string; border: string }> = {
  playing: { bg: "bg-primary/20", text: "text-primary", border: "border-primary/30" },
  played: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  backlog: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  halted: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" },
};

const statusLabels: Record<GameStatus, string> = {
  playing: "Ongoing",
  played: "Completed",
  backlog: "Backlog",
  halted: "Halted",
};

export function GameCard({ game }: GameCardProps) {
  const sColors = statusColors[game.status];

  return (
    <Link href={`/games/${game.id}`}>
      <Card className="group overflow-hidden cursor-pointer bg-card/40 hover:bg-card/80 border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)] hover:-translate-y-1 h-full flex flex-col relative backdrop-blur-sm">
        {/* Aspect Ratio Image Container */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/30">
          {game.coverUrl ? (
            <img 
              src={game.coverUrl} 
              alt={game.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23222"/><text x="50" y="50" font-family="sans-serif" font-size="14" fill="%23666" text-anchor="middle" alignment-baseline="middle">No Cover</text></svg>';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-card to-muted">
              <Gamepad2 className="w-12 h-12 mb-2 opacity-50" />
              <span className="text-xs uppercase tracking-widest font-mono">No Cover</span>
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent opacity-80" />
          
          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
            <Badge variant="outline" className={cn("backdrop-blur-md px-2.5 py-0.5 border shadow-sm", sColors.bg, sColors.text, sColors.border)}>
              {statusLabels[game.status]}
            </Badge>
            
            {game.rating && (
              <Badge variant="secondary" className="backdrop-blur-md bg-black/50 text-yellow-400 border-yellow-500/30 px-2 flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 fill-yellow-400" />
                <span className="font-bold font-mono">{game.rating}</span>
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col justify-end -mt-16 z-10">
          <div className="space-y-1 mb-3">
            <h3 className="font-bold text-lg leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {game.title}
            </h3>
            {game.platform && (
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {game.platform}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
            {game.hoursPlayed ? (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{game.hoursPlayed}h</span>
              </div>
            ) : null}
            
            {game.genre && (
              <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 h-5 bg-card/50">
                {game.genre}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
