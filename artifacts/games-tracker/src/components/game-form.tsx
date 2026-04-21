import { Game, GameStatus, CreateGameInput, UpdateGameInput, useCreateGame, useUpdateGame, getListGamesQueryKey, getGetGameStatsQueryKey, getGetRecentActivityQueryKey, getGetGameQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";

const gameSchema = z.object({
  title: z.string().min(1, "Title is required"),
  platform: z.string().optional(),
  genre: z.string().optional(),
  status: z.enum(["played", "playing", "backlog", "halted"]),
  rating: z.number().min(1).max(10).optional().nullable(),
  coverUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
  hoursPlayed: z.coerce.number().min(0).optional().nullable(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
});

type GameFormValues = z.infer<typeof gameSchema>;

interface GameFormProps {
  game?: Game;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GameForm({ game, open, onOpenChange }: GameFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();

  const isEditing = !!game;

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      title: game?.title || "",
      platform: game?.platform || "",
      genre: game?.genre || "",
      status: game?.status || "backlog",
      rating: game?.rating || null,
      coverUrl: game?.coverUrl || "",
      notes: game?.notes || "",
      hoursPlayed: game?.hoursPlayed || null,
      startedAt: game?.startedAt?.split('T')[0] || "",
      finishedAt: game?.finishedAt?.split('T')[0] || "",
    },
  });

  const onSubmit = async (data: GameFormValues) => {
    try {
      const payload = {
        ...data,
        rating: data.rating || undefined,
        hoursPlayed: data.hoursPlayed || undefined,
        coverUrl: data.coverUrl || undefined,
        platform: data.platform || undefined,
        genre: data.genre || undefined,
        notes: data.notes || undefined,
        startedAt: data.startedAt ? new Date(data.startedAt).toISOString() : undefined,
        finishedAt: data.finishedAt ? new Date(data.finishedAt).toISOString() : undefined,
      };

      if (isEditing && game) {
        await updateGame.mutateAsync({ id: game.id, data: payload as UpdateGameInput });
        toast({ title: "Game updated", description: `${data.title} has been updated.` });
        queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(game.id) });
      } else {
        await createGame.mutateAsync({ data: payload as CreateGameInput });
        toast({ title: "Game added", description: `${data.title} has been added to your library.` });
      }

      queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetGameStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
      
      onOpenChange(false);
      if (!isEditing) {
        form.reset();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card/95 backdrop-blur-xl border-l border-white/10">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-sans text-2xl text-glow">{isEditing ? "Edit Game" : "Add to Library"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update your game details below." : "Track a new game in your personal collection."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. The Legend of Zelda" className="bg-background/50 border-white/10 focus-visible:border-primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-white/10">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="playing">Ongoing</SelectItem>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="played">Completed</SelectItem>
                        <SelectItem value="halted">Halted</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Platform</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-white/10">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PC">PC</SelectItem>
                        <SelectItem value="PS4">PS4</SelectItem>
                        <SelectItem value="PS5">PS5</SelectItem>
                        <SelectItem value="Xbox 360">Xbox 360</SelectItem>
                        <SelectItem value="PSP">PSP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Genre</FormLabel>
                    <FormControl>
                      <Input placeholder="RPG, Shooter..." className="bg-background/50 border-white/10" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hoursPlayed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Hours Played</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" className="bg-background/50 border-white/10" {...field} value={field.value === null ? "" : field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground flex justify-between">
                    <span>Rating</span>
                    {field.value ? <span className="text-yellow-400 font-bold">{field.value} / 10</span> : <span>Unrated</span>}
                  </FormLabel>
                  <FormControl>
                    <div className="pt-2 pb-4">
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={field.value ? [field.value] : [5]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                        className="cursor-pointer"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coverUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Cover Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." className="bg-background/50 border-white/10" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Date Started</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background/50 border-white/10" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="finishedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Date Finished</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background/50 border-white/10" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Personal Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What did you think of the game?" 
                      className="min-h-[100px] resize-none bg-background/50 border-white/10" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex gap-3">
              <Button type="button" variant="outline" className="w-full border-white/10" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(168,85,247,0.4)]" disabled={createGame.isPending || updateGame.isPending}>
                {isEditing ? "Save Changes" : "Add Game"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
