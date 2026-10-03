import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

function getUserDestination(user) {
  if (user?.role === "student") {
    return user.onboarding_completed
      ? "/loading"
      : "/student/onboarding";
  }

  if (user?.role === "organization") {
    return user.onboarding_completed ? "/loading" : "/organization/onboarding";
  }

  return "/";
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Outlet />;
  }

  return <Navigate to={getUserDestination(user)} replace />;
}

export function StudentOnboardingRoute() {
  const { user } = useAuth();

  if (user?.role !== "student") {
    return <Navigate to={getUserDestination(user)} replace />;
  }

  if (user.onboarding_completed) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <Outlet />;
}

export function StudentDashboardRoute() {
  const { user } = useAuth();

  if (user?.role !== "student") {
    return <Navigate to={getUserDestination(user)} replace />;
  }

  if (!user.onboarding_completed) {
    return <Navigate to="/student/onboarding" replace />;
  }

  return <Outlet />;
}

export function LoadingRoute() {
  const { user } = useAuth();

  if (user?.role === "student" && user.onboarding_completed) {
    return <Outlet />;
  }

  if (user?.role === "organization" && user.onboarding_completed) {
    return <Outlet />;
  }

  return <Navigate to={getUserDestination(user)} replace />;
}

export function OrganizationProfileRoute() {
  const { user } = useAuth();

  if (user?.role !== "organization") {
    return <Navigate to={getUserDestination(user)} replace />;
  }

  return <Outlet />;
}

export function OrganizationOnboardingRoute() {
  const { user } = useAuth();

  if (user?.role !== "organization") {
    return <Navigate to={getUserDestination(user)} replace />;
  }

  if (user.onboarding_completed) {
    return <Navigate to="/organization/dashboard" replace />;
  }

  return <Outlet />;
}