import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import GameDetail from "@/pages/game-detail";
import CategoryPage from "@/pages/category";
import Recommended from "@/pages/recommended";
import Landing from "@/pages/landing";
import { ThemeProvider } from "@/components/theme-provider";
import { DynamicBackground } from "@/components/dynamic-background";
import { installGuestFetchHeader, isGuestMode, setGuestMode } from "@/lib/guest-mode";
import { ClerkApiAuth } from "@/lib/clerk-api-auth";

installGuestFetchHeader();

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  if (!basePath) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.startsWith(basePath) ? normalized.slice(basePath.length) || "/" : normalized;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${typeof window !== "undefined" ? window.location.origin : ""}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(270, 80%, 60%)",
    colorForeground: "hsl(0, 0%, 98%)",
    colorMutedForeground: "hsl(0, 0%, 65%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(260, 30%, 8%)",
    colorInput: "hsl(260, 25%, 12%)",
    colorInputForeground: "hsl(0, 0%, 98%)",
    colorNeutral: "hsl(260, 20%, 25%)",
    colorModalBackdrop: "rgba(5, 0, 15, 0.75)",
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "bg-[hsl(260,30%,10%)]/95 backdrop-blur-xl border border-white/10 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_0_60px_-10px_rgba(168,85,247,0.4)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white text-2xl font-bold",
    headerSubtitle: "text-white/60",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-white/80 text-xs uppercase tracking-widest font-mono",
    footerActionLink: "text-primary hover:text-primary/80",
    footerActionText: "text-white/60",
    dividerText: "text-white/50",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-white",
    logoBox: "mb-2",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-white/10 hover:bg-white/5",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]",
    formFieldInput: "bg-[hsl(260,25%,12%)] border border-white/10 text-white",
    footerAction: "text-white/60",
    dividerLine: "bg-white/10",
    alert: "border border-white/10 bg-white/5",
    otpCodeFieldInput: "bg-[hsl(260,25%,12%)] border border-white/10 text-white",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  if (isGuestMode()) return <Home />;
  return (
    <>
      <Show when="signed-in">
        <Home />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  if (isGuestMode()) return <>{children}</>;
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to={`${basePath}/sign-in`} />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (user) {
        setGuestMode(false);
      }
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/completed">{() => (<Protected><CategoryPage title="Completed" subtitle="Games you've finished" status="played" /></Protected>)}</Route>
      <Route path="/ongoing">{() => (<Protected><CategoryPage title="Ongoing" subtitle="Games you're currently playing" status="playing" /></Protected>)}</Route>
      <Route path="/on-hold">{() => (<Protected><CategoryPage title="On Hold" subtitle="Games you've paused for later" status="on_hold" /></Protected>)}</Route>
      <Route path="/dropped">{() => (<Protected><CategoryPage title="Dropped" subtitle="Games you've abandoned" status="dropped" /></Protected>)}</Route>
      <Route path="/recommended">{() => (<Protected><Recommended /></Protected>)}</Route>
      <Route path="/games/:id">{() => (<Protected><GameDetail /></Protected>)}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to access your library" } },
        signUp: { start: { title: "Sync your email", subtitle: "Create an account to start tracking" } },
      }}
      routerPush={(to) => { setLocation(stripBase(to)); }}
      routerReplace={(to) => { setLocation(stripBase(to), { replace: true }); }}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkApiAuth />
        <ClerkQueryClientCacheInvalidator />
        <ThemeProvider>
          <TooltipProvider>
            <DynamicBackground />
            <AppRouter />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;