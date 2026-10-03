import { Routes, Route } from "react-router-dom";
import Login from "./shared/pages/Login";
import Register from "./shared/pages/Register";
import OrganizationProfile from "./organization/pages/OrganizationProfile";
import OrganizationDashboard from "./organization/pages/OrganizationDashboard";
import StudentDashboard from "./student/pages/StudentDashboard";
import LoadingScreen from "./shared/pages/LoadingScreen";
import LandingPage from "./shared/components/LandingPage";
import StudentOnboarding from "./student/pages/StudentOnboarding";
import DashboardMenu from "./shared/pages/DashboardMenu";
import { AuthProvider } from "./shared/auth/AuthProvider";
import {
  GuestRoute,
  OrganizationOnboardingRoute,
  OrganizationProfileRoute,
  ProtectedRoute,
  StudentDashboardRoute,
  StudentOnboardingRoute,
  LoadingRoute,
} from "./shared/auth/RouteGuards";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Only guests */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Authenticated student */}
        <Route element={<ProtectedRoute />}>
          {/* Onboarding */}
          <Route element={<StudentOnboardingRoute />}>
            <Route path="/student/onboarding" element={<StudentOnboarding />} />
          </Route>

          {/* Dashboard */}
          <Route element={<StudentDashboardRoute />}>
            <Route element={<DashboardMenu />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
            </Route>
          </Route>

          <Route element={<LoadingRoute />}>
            <Route path="/loading" element={<LoadingScreen />} />
          </Route>

          <Route element={<OrganizationOnboardingRoute />}>
            <Route
              path="/organization/onboarding"
              element={<OrganizationProfile />}
            />
          </Route>

          <Route element={<OrganizationProfileRoute />}>
            <Route element={<DashboardMenu />}>
              <Route
                path="/organization/dashboard"
                element={<OrganizationDashboard />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
