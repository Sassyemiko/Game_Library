import { useListGames, getListGamesQueryKey, GameStatus } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { GameCard } from "@/components/game-card";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CategoryPageProps {
  title: string;
  subtitle: string;
  status?: GameStatus;
  filter?: "recommended";
}

export default function CategoryPage({ title, subtitle, status, filter }: CategoryPageProps) {
  const params = status ? { status } : undefined;
  const { data: games, isLoading, isError, refetch } = useListGames(
    params,
    { query: { queryKey: getListGamesQueryKey(params) } }
  );

  const filtered = filter === "recommended"
    ? (games || []).filter(g => (g.rating ?? 0) >= 8).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    : games || [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-sans tracking-tight mb-2 text-glow">{title}</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">
            {subtitle} · {filtered.length} {filtered.length === 1 ? "GAME" : "GAMES"}
          </p>
        </div>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-primary space-y-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="font-mono text-sm tracking-widest uppercase">Loading...</p>
          </div>
        ) : isError ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-destructive font-mono">Error loading games.</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
            {filtered.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl bg-white/5">
            <p className="font-mono text-sm uppercase tracking-widest">No games in this category yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
