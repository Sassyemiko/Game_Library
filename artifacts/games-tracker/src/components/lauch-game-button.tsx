import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Game,
  getGetGameQueryKey,
  getGetGameStatsQueryKey,
  getListGamesQueryKey,
} from "@workspace/api-client-react";
import { TRACKER_OFFLINE_MESSAGE, trackerRequest } from "@/lib/tracker-api";
import { useTrackerStatus } from "@/hooks/use-tracker-status";

interface LaunchGameButtonProps {
  game: Game;
  userId: string;
}

function formatElapsed(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function LaunchGameButton({ game, userId }: LaunchGameButtonProps) {
  const [launching, setLaunching] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { markRunning, markStopped } = useTrackerStatus(
    game,
    userId,
    isRunning,
    setIsRunning,
    setElapsedSeconds,
  );

  const startRecordingTimer = () => {
    if (timerRef.current !== null) return;
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (isRunning) {
      startRecordingTimer();
    } else {
      stopRecordingTimer();
      if (!launching) {
        setElapsedSeconds(0);
      }
    }

    return () => {
      stopRecordingTimer();
    };
  }, [isRunning, launching]);

  const handleLaunch = async () => {
    if (!game.executablePath) {
      toast({
        title: "No executable path",
        description: "Please add the game executable path in edit mode.",
        variant: "destructive",
      });
      return;
    }

    setLaunching(true);
    try {
      const { ok, data, unreachable } = await trackerRequest("/launch", {
        game_id: game.id,
        game_title: game.title,
        executable_path: game.executablePath,
        user_id: userId,
      });

      if (unreachable || !ok) {
        throw new Error(TRACKER_OFFLINE_MESSAGE);
      }

      if (data?.success) {
        markRunning();
        toast({
          title: "Game launched",
          description: `${game.title} is now running. Playtime tracking started.`,
        });
      } else {
        markStopped();
        throw new Error(data?.error || "Failed to launch game");
      }
    } catch (error) {
      toast({
        title: "Launch failed",
        description:
          error instanceof Error ? error.message : TRACKER_OFFLINE_MESSAGE,
        variant: "destructive",
      });
    } finally {
      setLaunching(false);
    }
  };

  const handleStop = async () => {
    try {
      const { ok, data, unreachable } = await trackerRequest("/stop", {
        game_id: game.id,
        user_id: userId,
      });

      if (unreachable || !ok) {
        throw new Error(TRACKER_OFFLINE_MESSAGE);
      }

      if (data?.success) {
        markStopped();
        const totalSeconds = data.total_seconds ?? 0;
        toast({
          title: "Session ended",
          description: `Played for ${Math.round(totalSeconds / 60)} minutes.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(game.id) });
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetGameStatsQueryKey() });
      }
    } catch (error) {
      toast({
        title: "Stop failed",
        description:
          error instanceof Error ? error.message : "Game may have already closed.",
        variant: "destructive",
      });
    }
  };

  if (!game.executablePath) {
    return null;
  }

  return (
    <div className="space-y-3">
      {(isRunning || launching) && (
        <div
          className={`rounded-xl border p-4 ${
            isRunning
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-primary/30 bg-primary/10"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                isRunning
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-primary animate-pulse"
              }`}
            />
            <Clock className="h-4 w-4 shrink-0 opacity-80" />
            <span className={isRunning ? "text-emerald-200" : "text-primary"}>
              {isRunning ? "Recording playtime" : "Launching game…"}
            </span>
          </div>
          {isRunning && (
            <p className="mt-3 font-mono text-3xl font-semibold tabular-nums tracking-wider text-emerald-100">
              {formatElapsed(elapsedSeconds)}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {!isRunning ? (
          <Button
            onClick={handleLaunch}
            disabled={launching}
            className="w-full justify-start bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
          >
            {launching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {launching ? "Launching…" : "Launch Game"}
          </Button>
        ) : (
          <Button
            onClick={handleStop}
            variant="destructive"
            className="w-full justify-start bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Tracking
          </Button>
        )}
      </div>
    </div>
  );
}
