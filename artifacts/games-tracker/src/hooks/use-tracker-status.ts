import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGameQueryKey,
  getGetGameStatsQueryKey,
  getListGamesQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { trackerRequest } from "@/lib/tracker-api";

type TrackerGame = {
  id: string;
  title: string;
  executablePath?: string | null;
};

export function useTrackerStatus(
  game: TrackerGame | undefined,
  userId: string,
  isRunning: boolean,
  setIsRunning: (running: boolean) => void,
  setElapsedSeconds?: (seconds: number) => void,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wasRunningRef = useRef(false);

  const checkIfRunning = useCallback(async () => {
    if (!game?.executablePath) return;

    const { ok, data, unreachable } = await trackerRequest("/status", {
      game_id: game.id,
      game_title: game.title,
      executable_path: game.executablePath,
      user_id: userId,
    });

    if (unreachable || !ok || !data) {
      return;
    }

    const running = !!data.running;

    if (running && typeof data.total_seconds === "number") {
      setElapsedSeconds?.(data.total_seconds);
    }

    if (wasRunningRef.current && !running) {
      toast({
        title: "Game closed",
        description: "Playtime has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(game.id) });
      queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetGameStatsQueryKey() });
      setElapsedSeconds?.(0);
    }

    wasRunningRef.current = running;
    setIsRunning(running);
  }, [game, userId, queryClient, setIsRunning, setElapsedSeconds, toast]);

  useEffect(() => {
    if (game?.executablePath) {
      void checkIfRunning();
    }
  }, [game?.id, game?.executablePath, checkIfRunning]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      void checkIfRunning();
    }, 3000);
    return () => clearInterval(interval);
  }, [isRunning, checkIfRunning]);

  const markRunning = useCallback(() => {
    wasRunningRef.current = true;
    setIsRunning(true);
    setElapsedSeconds?.(0);
  }, [setIsRunning, setElapsedSeconds]);

  const markStopped = useCallback(() => {
    wasRunningRef.current = false;
    setIsRunning(false);
    setElapsedSeconds?.(0);
  }, [setIsRunning, setElapsedSeconds]);

  return { checkIfRunning, markRunning, markStopped };
}
