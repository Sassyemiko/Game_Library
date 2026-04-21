import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import GameDetail from "@/pages/game-detail";
import CategoryPage from "@/pages/category";
import { ThemeProvider } from "@/components/theme-provider";
import { DynamicBackground } from "@/components/dynamic-background";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/completed">
        {() => <CategoryPage title="Completed" subtitle="Games you've finished" status="played" />}
      </Route>
      <Route path="/ongoing">
        {() => <CategoryPage title="Ongoing" subtitle="Games you're currently playing" status="playing" />}
      </Route>
      <Route path="/halted">
        {() => <CategoryPage title="Halted" subtitle="Games you've paused or dropped" status="halted" />}
      </Route>
      <Route path="/recommended">
        {() => <CategoryPage title="Recommended" subtitle="Your top-rated picks (8+)" filter="recommended" />}
      </Route>
      <Route path="/games/:id" component={GameDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <DynamicBackground />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
