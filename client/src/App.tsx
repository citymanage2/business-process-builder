import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Companies from "./pages/Companies";
import InterviewChoice from "./pages/InterviewChoice";
import Interview from "./pages/Interview";
import FormInterview from "./pages/FormInterview";
import ProcessGenerate from "./pages/ProcessGenerate";
import ProcessView from "./pages/ProcessView";
import Profile from "./pages/Profile";
import CompanyProcesses from "./pages/CompanyProcesses";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/companies" component={Companies} />
      <Route path="/interview-choice/:id" component={InterviewChoice} />
      <Route path="/interview/:id" component={Interview} />
      <Route path="/form-interview/:id/:type" component={FormInterview} />
      <Route path="/process/generate/:companyId/:interviewId" component={ProcessGenerate} />
      <Route path="/process/:id" component={ProcessView} />
      <Route path="/profile" component={Profile} />
      <Route path="/company/:id/processes" component={CompanyProcesses} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
