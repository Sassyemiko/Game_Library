import { useListGames, useGetGameStats, useGetRecentActivity, getListGamesQueryKey, getGetGameStatsQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { GameCard } from "@/components/game-card";
import { GameForm } from "@/components/game-form";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Clock, Library, Target, Loader2, RefreshCw, Star, Gamepad2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Home() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useGetGameStats({
    query: { queryKey: getGetGameStatsQueryKey() }
  });

  const { data: recentActivity, isLoading: recentLoading } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  const { data: playingGames, isLoading: playingLoading, isError, refetch } = useListGames(
    { status: "playing" },
    { query: { queryKey: getListGamesQueryKey({ status: "playing" }) } }
  );

  const isLoading = statsLoading || recentLoading || playingLoading;

  // ✅ FIX: Ensure playingGames is an array before using array methods
  const safePlayingGames = Array.isArray(playingGames) ? playingGames : [];
  const sortedPlaying = safePlayingGames.slice().sort((a, b) => {
    const aDate = a.updatedAt || a.startedAt || "";
    const bDate = b.updatedAt || b.startedAt || "";
    return bDate.localeCompare(aDate);
  });
  const featured = sortedPlaying[0];

  // ✅ FIX: Also guard recentActivity for safety
  const safeRecentActivity = Array.isArray(recentActivity) ? recentActivity : [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-bold font-sans tracking-tight mb-2 text-glow">Dashboard</h1>
            <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">
              {stats?.total || 0} GAMES TRACKED
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]">
            <Plus className="w-4 h-4 mr-2" />
            Add Game
          </Button>
        </div>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-primary space-y-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="font-mono text-sm tracking-widest uppercase">Loading Databanks...</p>
          </div>
        ) : isError ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-destructive font-mono">Error connecting to databanks.</p>
            <Button variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
          </div>
        ) : (
          <>
            {/* Featured: Recently Playing */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Recently Playing
                </h2>
                {sortedPlaying.length > 1 && (
                  <Link href="/ongoing">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary cursor-pointer flex items-center gap-1">
                      View all <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                )}
              </div>

              {featured ? (
                <Link href={`/games/${featured.id}`}>
                  <Card className="group overflow-hidden cursor-pointer bg-card/40 hover:bg-card/80 border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_40px_-5px_rgba(168,85,247,0.4)] backdrop-blur-sm">
                    <div className="grid md:grid-cols-[280px_1fr] gap-0">
                      <div className="relative aspect-[3/4] md:aspect-auto md:h-full bg-muted/30 overflow-hidden">
                        {featured.coverUrl ? (
                          <img
                            src={featured.coverUrl}
                            alt={featured.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-card to-muted">
                            <Gamepad2 className="w-16 h-16 opacity-40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/40 md:to-card/80 pointer-events-none" />
                      </div>
                      <CardContent className="p-6 md:p-8 flex flex-col justify-center space-y-4">
                        <Badge variant="outline" className="self-start bg-primary/20 text-primary border-primary/30 px-2.5 py-0.5">
                          Ongoing
                        </Badge>
                        <div>
                          <h3 className="text-3xl md:text-4xl font-bold tracking-tight group-hover:text-primary transition-colors">
                            {featured.title}
                          </h3>
                          {featured.platform && (
                            <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest mt-1">
                              {featured.platform}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {featured.hoursPlayed ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span className="font-mono">{featured.hoursPlayed}h played</span>
                            </div>
                          ) : null}
                          {featured.rating ? (
                            <div className="flex items-center gap-1.5 text-yellow-400">
                              <Star className="w-4 h-4 fill-yellow-400" />
                              <span className="font-mono font-bold">{featured.rating}/10</span>
                            </div>
                          ) : null}
                          {featured.genre && (
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">{featured.genre}</Badge>
                          )}
                        </div>
                        {featured.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-2 italic">"{featured.notes}"</p>
                        )}
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              ) : (
                <div className="py-12 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl bg-white/5">
                  <Target className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="font-mono text-sm uppercase tracking-widest">No games currently in progress.</p>
                  <Button variant="outline" className="mt-4 border-white/10" onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add a game
                  </Button>
                </div>
              )}
            </section>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card/40 backdrop-blur-sm border-white/5">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Games</p>
                      <p className="text-3xl font-bold text-foreground">{stats?.total || 0}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <Library className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 backdrop-blur-sm border-white/5">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Completed</p>
                      <p className="text-3xl font-bold text-emerald-400">{stats?.played || 0}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Trophy className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 backdrop-blur-sm border-white/5">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Ongoing</p>
                      <p className="text-3xl font-bold text-primary">{stats?.playing || 0}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 backdrop-blur-sm border-white/5">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Hours</p>
                      <p className="text-3xl font-bold text-amber-400">{stats?.totalHours || 0}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            {safeRecentActivity.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {safeRecentActivity.slice(0, 4).map(game => (
                    <GameCard key={`recent-${game.id}`} game={game} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <GameForm open={isAddOpen} onOpenChange={setIsAddOpen} />
    </Layout>
  );
}