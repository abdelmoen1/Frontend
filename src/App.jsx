import { Routes, Route } from "react-router-dom";
import Login from "./shared/pages/Login";
import Register from "./shared/pages/Register";
import OrganizationOnboarding from "./organization/pages/OrganizationOnboarding";
import OrganizationProfilePage from "./organization/pages/OrganizationProfilePage";
import EditOrganizationProfile from "./organization/pages/EditOrganizationProfile";
import OrganizationDashboard from "./organization/pages/OrganizationDashboard";
import ProjectDiscovery from "./organization/pages/ProjectIntro";
import StudentDashboard from "./student/pages/StudentDashboard";
import UpdateStudentProfile from "./student/pages/UpdateStudentProfile";
import LoadingScreen from "./shared/pages/LoadingScreen";
import LandingPage from "./shared/components/LandingPage";
import StudentOnboarding from "./student/pages/StudentOnboarding";
import DashboardMenu from "./shared/pages/DashboardMenu";
import OrganizationProjects from "./organization/pages/OrganizationProjects";
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
              <Route
                path="/student/profile"
                element={<UpdateStudentProfile />}
              />
            </Route>
          </Route>

          <Route element={<LoadingRoute />}>
            <Route path="/loading" element={<LoadingScreen />} />
          </Route>

          <Route element={<OrganizationOnboardingRoute />}>
            <Route
              path="/organization/onboarding"
              element={<OrganizationOnboarding />}
            />
          </Route>

          <Route element={<OrganizationProfileRoute />}>
            <Route element={<DashboardMenu />}>
              <Route
                path="/organization/profile"
                element={<OrganizationProfilePage />}
              />
              <Route
                path="/organization/profile/edit"
                element={<EditOrganizationProfile />}
              />
              <Route
                path="/organization/dashboard"
                element={<OrganizationDashboard />}
              />
              <Route
                path="/organization/requests"
                element={<OrganizationProjects />}
              />
              <Route
                path="/organization/requests/new"
                element={<ProjectDiscovery mode="intro" />}
              />
              <Route
                path="/organization/requests/:id"
                element={<ProjectDiscovery mode="detail" />}
              />
              <Route
                path="/organization/requests/:id/intake"
                element={<ProjectDiscovery mode="intake" />}
              />
              <Route
                path="/organization/requests/:id/proposal"
                element={<ProjectDiscovery mode="proposal" />}
              />
              <Route
                path="/organization/requests/:id/review"
                element={<ProjectDiscovery mode="review" />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
