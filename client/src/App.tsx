import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import VerifyEmail from "@/pages/VerifyEmail";
import ResetPassword from "@/pages/ResetPassword";
import ForgotPassword from "@/pages/ForgotPassword";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login.tsx";
import FAQ from "./pages/FAQ";
import Companies from "./pages/Companies";
import InterviewChoice from "./pages/InterviewChoice";
import Interview from "./pages/Interview";
import FormInterview from "./pages/FormInterview";
import ProcessGenerate from "./pages/ProcessGenerate";
import ProcessView from "./pages/ProcessView";
import Profile from "./pages/Profile";
import CompanyProcesses from "./pages/CompanyProcesses";
import Admin from "./pages/Admin";
import AdminSupport from "./pages/AdminSupport";
import SupportChat from "./components/SupportChat";
import Processes from "./pages/Processes";
import ProcessBuilder from "./pages/ProcessBuilder";
import Analytics from "./pages/Analytics";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/verify-email"} component={VerifyEmail} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/404"} component={NotFound} />
      <Route path={"/faq"} component={FAQ} />
      <Route path={"/companies"} component={Companies} />
      <Route path="/interview-choice/:id" component={InterviewChoice} />
      <Route path="/interview/:id" component={Interview} />
      <Route path="/form-interview/:id/:type" component={FormInterview} />
      <Route path="/process/generate/:companyId/:interviewId" component={ProcessGenerate} />
      <Route path="/process/:id" component={ProcessView} />
      <Route path="/profile" component={Profile} />
      <Route path="/company/:id/processes" component={CompanyProcesses} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/support" component={AdminSupport} />
      {/* Process Builder routes */}
      <Route path="/processes" component={Processes} />
      <Route path="/builder" component={ProcessBuilder} />
      <Route path="/builder/:id" component={ProcessBuilder} />
      <Route path="/analytics" component={Analytics} />
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
          <SupportChat />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
