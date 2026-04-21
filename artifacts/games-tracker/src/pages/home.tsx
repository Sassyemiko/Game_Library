import { useListGames, useGetGameStats, useGetRecentActivity, getListGamesQueryKey, getGetGameStatsQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { GameCard } from "@/components/game-card";
import { GameForm } from "@/components/game-form";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Clock, Library, Target, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import emptyStateImage from "@assets/empty-state.png";

export default function Home() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'playing' | 'backlog' | 'played'>('all');

  const { data: stats, isLoading: statsLoading } = useGetGameStats({
    query: { queryKey: getGetGameStatsQueryKey() }
  });
  
  const { data: recentActivity, isLoading: recentLoading } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  const { data: games, isLoading: gamesLoading, isError, refetch } = useListGames(
    activeTab === 'all' ? undefined : { status: activeTab },
    { query: { queryKey: getListGamesQueryKey(activeTab === 'all' ? undefined : { status: activeTab }) } }
  );

  const isLoading = statsLoading || recentLoading || gamesLoading;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-bold font-sans tracking-tight mb-2 text-glow">Library</h1>
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
        ) : stats?.total === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img src="/empty-state.png" alt="Retro Console" className="w-full h-auto object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center">
                <h2 className="text-2xl font-bold mb-2">Initialize Your Collection</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Your library is currently empty. Add your first game to start tracking your playtime, backlog, and reviews.
                </p>
                <Button size="lg" onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Game
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Now Playing</p>
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

            {/* Recent Activity (Horizontal Scroll) */}
            {recentActivity && recentActivity.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
                <ScrollArea className="w-full whitespace-nowrap pb-4">
                  <div className="flex w-max space-x-4">
                    {recentActivity.map(game => (
                      <div key={`recent-${game.id}`} className="w-[200px] md:w-[240px]">
                        <GameCard game={game} />
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="bg-white/5" />
                </ScrollArea>
              </div>
            )}

            {/* Main Library Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold tracking-tight">Collection</h2>
                <div className="flex gap-2">
                  {(['all', 'playing', 'backlog', 'played'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                        activeTab === tab 
                          ? 'bg-primary/20 text-primary border border-primary/30' 
                          : 'text-muted-foreground hover:bg-white/5'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {games && games.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                  {games.map(game => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl bg-white/5">
                  <p className="font-mono text-sm uppercase tracking-widest">No games found in this category.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <GameForm open={isAddOpen} onOpenChange={setIsAddOpen} />
    </Layout>
  );
}
