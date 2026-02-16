import { Switch, Route, useLocation } from "wouter";
import { buildApiUrl } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { logoutAndRedirect, resetSessionHeartbeat, subscribeToSession, readStoredSession } from "@/utils/session";
import Navbar from "@/components/layout/Navbar";
import NotFound from "@/pages/not-found";
import AssessmentPage from "@/pages/AssessmentPage";
import EnrollmentPage from "@/pages/EnrollmentPage";
import CoursePlayerPage from "@/pages/CoursePlayerPage";
import CongratsPage from "@/pages/CongratsPage";
import CongratsFeedbackPage from "@/pages/CongratsFeedbackPage";
import CourseCertificatePage from "@/pages/CourseCertificatePage";
import LandingPage from "@/pages/LandingPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import BecomeTutorPage from "@/pages/BecomeTutorPage";
import CourseDetailsPage from "@/pages/CourseDetailsPage";

import CohortPage from "@/pages/CohortPage";
import OnDemandPage from "@/pages/OnDemandPage";
import WorkshopPage from "@/pages/WorkshopPage";
import StudentDashboardPage from "@/pages/Strudent_Dashboard";
import RegistrationPage from "@/pages/RegistrationPage";

import MethodologyPage from "@/pages/MethodologyPage";
import MoreInfoPage from "@/pages/MoreInfoPage";

function Router() {
  return (
    <Switch>
      <Route path="/become-a-tutor" component={BecomeTutorPage} />
      <Route path="/methodology" component={MethodologyPage} />
      <Route path="/more-info" component={MoreInfoPage} />
      <Route path="/our-courses/cohort" component={CohortPage} />
      <Route path="/our-courses/on-demand" component={OnDemandPage} />
      <Route path="/our-courses/workshops" component={WorkshopPage} />

      {/* Registration Routes - URL-driven multi-stage flow */}
      <Route path="/registration" component={RegistrationPage} />
      <Route path="/registration/:programType" component={RegistrationPage} />
      <Route path="/registration/:programType/:courseSlug" component={RegistrationPage} />
      <Route path="/registration/:programType/:courseSlug/assessment" component={RegistrationPage} />
      <Route path="/registration/:programType/:courseSlug/success" component={RegistrationPage} />

      {/* Course Routes */}
      <Route path="/course/:id/assessment" component={AssessmentPage} />
      <Route path="/course/:id/enroll" component={EnrollmentPage} />
      <Route path="/course/:id/learn/:lesson" component={CoursePlayerPage} />
      <Route path="/course/:id/congrats/certificate" component={CourseCertificatePage} />
      <Route path="/course/:id/congrats/feedback" component={CongratsFeedbackPage} />
      <Route path="/course/:id/congrats" component={CongratsPage} />
      <Route path="/course/:id" component={CourseDetailsPage} />
      <Route path="/student-dashboard" component={StudentDashboardPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />


      {/* Default route goes to dashboard */}
      <Route path="/" component={LandingPage} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}


function App({ isAuthenticated, user, setIsAuthenticated, setUser }: any) {
  const [location] = useLocation();
  const hadSessionRef = useRef(false);
  const logoutTriggeredRef = useRef(false);
  const shouldHideNavbar =
    location === "/course" ||
    location.startsWith("/course/") ||
    location.startsWith("/registration") ||
    location === "/student-dashboard";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isAuthCallback = () => window.location.pathname === "/auth/callback";

    const unsubscribe = subscribeToSession((session) => {
      if (session?.accessToken) {
        hadSessionRef.current = true;
        logoutTriggeredRef.current = false;
        return;
      }

      const storedAuth = window.localStorage.getItem("isAuthenticated") === "true";
      if ((hadSessionRef.current || storedAuth) && !isAuthCallback() && !logoutTriggeredRef.current) {
        logoutTriggeredRef.current = true;
        logoutAndRedirect("/");
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isAuthCallback()) {
        resetSessionHeartbeat();
      }
    };

    const handleFocus = () => {
      if (!isAuthCallback()) {
        resetSessionHeartbeat();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScrollToTop />
        <Toaster />
        {!shouldHideNavbar && (
          <Navbar
            onLogin={() => {
              const homeRedirect = '/';
              sessionStorage.setItem("postLoginRedirect", homeRedirect);
              // Use buildApiUrl to ensure we target the correct backend port (4000)
              const target = `${buildApiUrl('/auth/google')}?redirect=${encodeURIComponent(homeRedirect)}`;
              window.location.href = target;
            }}
            onApplyTutor={() => window.location.href = '/become-a-tutor'}
            isAuthenticated={isAuthenticated}
            user={user ?? undefined}
            onLogout={() => {
              localStorage.removeItem('session');
              localStorage.removeItem('user');
              localStorage.setItem('isAuthenticated', 'false');
              setIsAuthenticated(false);
              setUser(null);
              window.location.href = '/';
            }}
          />
        )}
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AppWithState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ fullName?: string; email?: string; picture?: string } | null>(null);

  useEffect(() => {
    // Check initial auth
    const init = async () => {
      const session = await readStoredSession();
      if (session?.accessToken) {
        setIsAuthenticated(true);
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
      } else {
        // Fallback to purely local storage if session check fails or is simpler
        const storedAuth = localStorage.getItem('isAuthenticated') === 'true';
        const storedUser = localStorage.getItem('user');
        if (storedAuth && storedUser) {
          setIsAuthenticated(true);
          setUser(JSON.parse(storedUser));
        }
      }
    }
    init();

    // Subscribe to changes
    const unsubscribe = subscribeToSession((session) => {
      if (session?.accessToken) {
        setIsAuthenticated(true);
        // We might not get full user object from session update event depending on implementation
        // but we can try reading from LS
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return <App isAuthenticated={isAuthenticated} user={user} setIsAuthenticated={setIsAuthenticated} setUser={setUser} />;
}

export default AppWithState;
