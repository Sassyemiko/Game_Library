import { useGetGame, useDeleteGame, useUpdateGame, getGetGameQueryKey, getListGamesQueryKey, getGetGameStatsQueryKey, getGetRecentActivityQueryKey, UpdateGameInput } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { useRoute, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, Clock, Calendar, Star, Gamepad2, Loader2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { GameForm } from "@/components/game-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function GameDetail() {
  const [, params] = useRoute("/games/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: game, isLoading, isError } = useGetGame(id!, {
    query: { enabled: !!id, queryKey: getGetGameQueryKey(id!) }
  });

  const deleteGame = useDeleteGame();
  const updateGame = useUpdateGame();

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteGame.mutateAsync({ id });
      toast({ title: "Game deleted", description: "Game has been removed from your library." });
      queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetGameStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
      setLocation("/");
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete game.", variant: "destructive" });
    }
  };

  const handleStatusChange = async (newStatus: "played" | "playing" | "backlog") => {
    if (!id || !game) return;
    try {
      const payload: UpdateGameInput = { status: newStatus };
      if (newStatus === "playing" && !game.startedAt) {
        payload.startedAt = new Date().toISOString();
      }
      if (newStatus === "played" && !game.finishedAt) {
        payload.finishedAt = new Date().toISOString();
      }

      await updateGame.mutateAsync({ id, data: payload });
      toast({ title: "Status updated", description: `Marked as ${newStatus}` });
      queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetGameStatsQueryKey() });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[60vh] flex flex-col items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (isError || !game) {
    return (
      <Layout>
        <div className="py-20 text-center">
          <h2 className="text-2xl font-bold mb-4 text-destructive">Game Not Found</h2>
          <Button onClick={() => setLocation("/")} variant="outline">Return to Library</Button>
        </div>
      </Layout>
    );
  }

  const bgStyle = game.coverUrl ? {
    backgroundImage: `url(${game.coverUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {};

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-20">
        
        <Link href="/">
          <Button variant="ghost" className="mb-6 pl-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
          </Button>
        </Link>

        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden mb-8 border border-white/10 shadow-2xl">
          {/* Blurred Background Banner */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-3xl z-10" />
            <div className="w-full h-full opacity-50 blur-xl" style={bgStyle} />
          </div>

          <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-end">
            
            {/* Cover Image */}
            <div className="w-48 md:w-64 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-muted/30 aspect-[3/4]">
               {game.coverUrl ? (
                <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-card">
                   <Gamepad2 className="w-12 h-12 opacity-50" />
                 </div>
               )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline" className={`px-3 py-1 font-mono uppercase tracking-widest bg-black/50 backdrop-blur-md
                  ${game.status === 'playing' ? 'text-primary border-primary/50' : 
                    game.status === 'played' ? 'text-emerald-400 border-emerald-500/50' : 
                    'text-amber-400 border-amber-500/50'}`}>
                  {game.status}
                </Badge>
                {game.platform && (
                  <Badge variant="secondary" className="px-3 py-1 bg-white/10 hover:bg-white/20 font-mono uppercase">
                    {game.platform}
                  </Badge>
                )}
                {game.genre && (
                  <Badge variant="secondary" className="px-3 py-1 bg-white/10 hover:bg-white/20 font-mono uppercase">
                    {game.genre}
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-sans tracking-tight text-glow text-white leading-tight">
                {game.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 pt-4 text-white/80 font-mono text-sm uppercase tracking-wider">
                {game.rating && (
                  <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-lg border border-yellow-400/20">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span className="font-bold text-lg">{game.rating}/10</span>
                  </div>
                )}
                
                {game.hoursPlayed !== null && game.hoursPlayed !== undefined && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{game.hoursPlayed} Hours</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content & Actions Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {game.notes ? (
              <div className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-2xl p-8">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">Personal Notes</h3>
                <div className="prose prose-invert max-w-none text-foreground/90 whitespace-pre-wrap">
                  {game.notes}
                </div>
              </div>
            ) : (
              <div className="bg-card/20 border border-dashed border-white/10 rounded-2xl p-8 text-center text-muted-foreground">
                <p className="font-mono text-sm uppercase tracking-widest">No notes added yet.</p>
                <Button variant="link" onClick={() => setIsEditOpen(true)} className="mt-2 text-primary">Add notes</Button>
              </div>
            )}
          </div>

          {/* Sidebar Info & Actions */}
          <div className="space-y-6">
            
            {/* Actions */}
            <div className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">Actions</h3>
              
              <div className="space-y-2">
                <Button variant="secondary" className="w-full justify-start bg-white/5 hover:bg-white/10" onClick={() => setIsEditOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Game
                </Button>
                <Button variant="destructive" className="w-full justify-start bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20" onClick={() => setIsDeleteOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Remove from Library
                </Button>
              </div>

              <div className="pt-4 border-t border-white/10">
                 <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Quick Status</p>
                 <div className="grid grid-cols-1 gap-2">
                   {game.status !== 'playing' && (
                     <Button size="sm" variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10" onClick={() => handleStatusChange('playing')}>
                       <Gamepad2 className="w-3 h-3 mr-2" /> Start Playing
                     </Button>
                   )}
                   {game.status !== 'played' && (
                     <Button size="sm" variant="outline" className="w-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleStatusChange('played')}>
                       <Trophy className="w-3 h-3 mr-2" /> Mark Completed
                     </Button>
                   )}
                 </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 space-y-4">
               <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">Timeline</h3>
               <div className="space-y-3">
                 <div className="flex items-center gap-3 text-sm">
                   <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                     <Calendar className="w-4 h-4 text-muted-foreground" />
                   </div>
                   <div>
                     <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono">Started</p>
                     <p className="font-medium text-foreground">{game.startedAt ? format(new Date(game.startedAt), "PPP") : "--"}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 text-sm">
                   <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                     <Calendar className="w-4 h-4 text-muted-foreground" />
                   </div>
                   <div>
                     <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono">Finished</p>
                     <p className="font-medium text-foreground">{game.finishedAt ? format(new Date(game.finishedAt), "PPP") : "--"}</p>
                   </div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>

      <GameForm game={game} open={isEditOpen} onOpenChange={setIsEditOpen} />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{game.title}" from your library. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
