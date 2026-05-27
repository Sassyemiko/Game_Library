import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGetFriendsProfile,
  useGetFriendRecommendations,
  useInviteFriend,
  useListFriends,
  useUpdateFriendsProfile,
  getGetFriendsProfileQueryKey,
  getGetFriendRecommendationsQueryKey,
  getListFriendsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isGuestMode } from "@/lib/guest-mode";
import {
  Sparkles,
  Users,
  Copy,
  UserPlus,
  Loader2,
  Clock,
  Trophy,
  Gamepad2,
  RefreshCw,
} from "lucide-react";

export default function Recommended() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const guestPreview = isGuestMode();
  const [inviteCode, setInviteCode] = useState("");
  const [nickname, setNickname] = useState("");

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useGetFriendsProfile({
    query: {
      enabled: !guestPreview,
      queryKey: getGetFriendsProfileQueryKey(),
    },
  });

  const friendCount = profile?.friendCount ?? 0;
  const shareLink = useMemo(() => {
    if (!profile?.referralCode || typeof window === "undefined") return null;
    const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");
    const base = `${window.location.origin}${appBase}`;
    return `${base}/recommended?ref=${encodeURIComponent(profile.referralCode)}`;
  }, [profile?.referralCode]);

  const { data: friendsList } = useListFriends({
    query: {
      enabled: !guestPreview && friendCount > 0,
      queryKey: getListFriendsQueryKey(),
    },
  });

  const {
    data: recommendations,
    isLoading: recsLoading,
    isError: recsError,
    refetch,
  } = useGetFriendRecommendations({
    query: {
      enabled: !guestPreview && friendCount > 0,
      queryKey: getGetFriendRecommendationsQueryKey(),
    },
  });

  const inviteFriend = useInviteFriend({
    mutation: {
      onSuccess: (result) => {
        setInviteCode("");
        toast({
          title: "Friend added",
          description: `${result.friend.displayName} is now in your circle.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetFriendsProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFriendsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFriendRecommendationsQueryKey() });
      },
      onError: (err: { message?: string }) => {
        toast({
          title: "Could not add friend",
          description: err?.message || "Check the referral code and try again.",
          variant: "destructive",
        });
      },
    },
  });

  const updateProfile = useUpdateFriendsProfile({
    mutation: {
      onSuccess: (updated) => {
        setNickname(updated.displayName);
        toast({
          title: "Nickname updated",
          description: `Friends will see you as ${updated.displayName}.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetFriendsProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFriendsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFriendRecommendationsQueryKey() });
      },
      onError: (err: { message?: string }) => {
        toast({
          title: "Could not update nickname",
          description: err?.message || "Use 1-32 characters and try again.",
          variant: "destructive",
        });
      },
    },
  });

  const copyReferralCode = async () => {
    if (!profile?.referralCode) return;
    try {
      await navigator.clipboard.writeText(profile.referralCode);
      toast({ title: "Copied", description: "Referral code copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: profile.referralCode,
      });
    }
  };

  const copyReferralLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: "Invite link copied",
        description: "Share this link so a friend can add your referral code quickly.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: shareLink,
      });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    const normalized = ref.trim().toUpperCase().slice(0, 12);
    if (normalized) {
      setInviteCode((current) => (current ? current : normalized));
      toast({
        title: "Referral code detected",
        description: `Ready to invite with code ${normalized}.`,
      });
    }
    params.delete("ref");
    const cleaned = params.toString();
    const nextUrl = `${window.location.pathname}${cleaned ? `?${cleaned}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [toast]);

  useEffect(() => {
    if (!profile?.displayName) return;
    setNickname((current) => (current ? current : profile.displayName));
  }, [profile?.displayName]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    inviteFriend.mutate({ data: { code } });
  };

  const handleNicknameSave = (e: React.FormEvent) => {
    e.preventDefault();
    const next = nickname.trim();
    if (!next || next === profile?.displayName) return;
    updateProfile.mutate({ data: { displayName: next } });
  };

  if (guestPreview) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto text-primary opacity-80" />
          <h1 className="text-3xl font-bold text-glow">Friend Recommendations</h1>
          <p className="text-muted-foreground">
            Sign in to get your referral code, invite friends, and see games they recommend plus
            playtime and achievement comparisons on shared titles.
          </p>
        </div>
      </Layout>
    );
  }

  const friendList = friendsList?.friends ?? recommendations?.friends ?? [];
  const friendRecs = recommendations?.friendRecommendations ?? [];
  const shared = recommendations?.sharedComparisons ?? [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-10 pb-12">
        <div>
          <h1 className="text-4xl font-bold font-sans tracking-tight mb-2 text-glow flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            Recommended
          </h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">
            Games friends suggest · Shared library comparisons
          </p>
        </div>

        {/* Referral & invite */}
        <Card className="bg-card/40 border-white/10 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Friends & referral codes</h2>
                <p className="text-sm text-muted-foreground">
                  Share your code so others can add you. Enter a friend&apos;s code to connect.
                </p>
              </div>
            </div>

            {profileLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading your code…
              </div>
            ) : profileError ? (
              <p className="text-destructive text-sm">Could not load your profile. Are you signed in?</p>
            ) : profile ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Your referral code
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-2xl font-bold font-mono tracking-widest text-primary">
                      {profile.referralCode}
                    </code>
                    <Button type="button" size="icon" variant="outline" onClick={copyReferralCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="outline" onClick={copyReferralLink}>
                      Copy link
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {friendCount} {friendCount === 1 ? "friend" : "friends"} connected
                  </p>
                  <form onSubmit={handleNicknameSave} className="pt-2 space-y-2">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Visible nickname
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Choose nickname"
                        className="bg-background/50 border-white/10"
                        maxLength={32}
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={
                          updateProfile.isPending ||
                          !nickname.trim() ||
                          nickname.trim() === (profile.displayName ?? "").trim()
                        }
                      >
                        {updateProfile.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>

                <form onSubmit={handleInvite} className="space-y-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Add a friend
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="Enter their code"
                      className="font-mono uppercase bg-background/50 border-white/10"
                      maxLength={12}
                    />
                    <Button
                      type="submit"
                      disabled={inviteFriend.isPending || !inviteCode.trim()}
                      className="shrink-0"
                    >
                      {inviteFriend.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}

            {friendList.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                {friendList.map((f) => (
                  <Badge key={f.id} variant="outline" className="border-white/10 bg-white/5">
                    {f.displayName}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {friendCount === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-xl bg-white/5 space-y-3">
            <Users className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
            <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
              Add friends to unlock recommendations
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Once a friend joins using your code (or you use theirs), you&apos;ll see games they
              love and side-by-side stats for titles you both play.
            </p>
          </div>
        ) : recsLoading ? (
          <div className="h-48 flex flex-col items-center justify-center text-primary">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : recsError ? (
          <div className="text-center space-y-3">
            <p className="text-destructive">Failed to load recommendations.</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Friend recommendations */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight">From your friends</h2>
              {friendRecs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No new picks yet — friends need highly rated games you don&apos;t have in your library.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friendRecs.map((rec, i) => (
                    <Card
                      key={`${rec.friendId}-${rec.game.id}-${i}`}
                      className="bg-card/40 border-white/10 overflow-hidden"
                    >
                      <div className="flex gap-4 p-4">
                        {rec.game.coverUrl ? (
                          <img
                            src={rec.game.coverUrl}
                            alt=""
                            className="w-16 h-24 object-cover rounded-lg shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-24 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                            <Gamepad2 className="w-6 h-6 opacity-40" />
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold line-clamp-2">{rec.game.title}</p>
                          <p className="text-xs text-primary">
                            {rec.friendName} · {rec.reason}
                          </p>
                          {rec.game.rating != null && (
                            <Badge variant="outline" className="text-[10px]">
                              ★ {rec.game.rating}/10
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Shared comparisons */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight">Shared games</h2>
              <p className="text-sm text-muted-foreground">
                Compare playtime and achievements on games you and friends both track.
              </p>
              {shared.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No overlapping games yet. Add the same titles to your libraries to compare.
                </p>
              ) : (
                <div className="space-y-4">
                  {shared.map((item) => (
                    <Card key={item.gameTitle} className="bg-card/40 border-white/10">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-4">
                          {item.coverUrl ? (
                            <img
                              src={item.coverUrl}
                              alt=""
                              className="w-14 h-20 object-cover rounded-lg"
                            />
                          ) : null}
                          <div>
                            <h3 className="font-bold text-lg">{item.gameTitle}</h3>
                            <Link href={`/games/${item.myGame.id}`}>
                              <span className="text-xs text-primary hover:underline">
                                View your entry
                              </span>
                            </Link>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-white/10">
                                <th className="pb-2 pr-4">Player</th>
                                <th className="pb-2 pr-4">Hours</th>
                                <th className="pb-2 pr-4">Achievements</th>
                                <th className="pb-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-white/5">
                                <td className="py-3 pr-4 font-medium text-primary">You</td>
                                <td className="py-3 pr-4">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {item.myGame.hoursPlayed ?? 0}h
                                  </span>
                                </td>
                                <td className="py-3 pr-4">
                                  <span className="flex items-center gap-1">
                                    <Trophy className="w-3.5 h-3.5" />
                                    {item.myGame.earnedAchievements.length}
                                  </span>
                                </td>
                                <td className="py-3 capitalize">{item.myGame.status.replace("_", " ")}</td>
                              </tr>
                              {item.friends.map((f) => (
                                <tr key={f.friendId} className="border-b border-white/5 last:border-0">
                                  <td className="py-3 pr-4">{f.friendName}</td>
                                  <td className="py-3 pr-4">{f.hoursPlayed ?? 0}h</td>
                                  <td className="py-3 pr-4">{f.earnedCount}</td>
                                  <td className="py-3 capitalize">{f.status.replace("_", " ")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
