import { Routes, Route } from "react-router-dom";
import Login from "./shared/pages/Login";
import Register from "./shared/pages/Register";
import GoogleCallback from "./shared/pages/GoogleCallback";
import OrganizationOnboarding from "./organization/pages/OrganizationOnboarding";
import OrganizationProfilePage from "./organization/pages/OrganizationProfilePage";
import EditOrganizationProfile from "./organization/pages/EditOrganizationProfile";
import OrganizationDashboard from "./organization/pages/OrganizationDashboard";
import ProjectDiscovery from "./organization/pages/ProjectIntro";
import StudentDashboard from "./student/pages/StudentDashboard";
import UpdateStudentProfile from "./student/pages/UpdateStudentProfile";
import StudentOpportunities from "./student/pages/StudentOpportunities";
import StudentOpportunityDetails from "./student/pages/StudentOpportunityDetails";
import StudentAssessments from "./student/pages/StudentAssessments";
import StudentAssessmentSession from "./student/pages/StudentAssessmentSession";
import LoadingScreen from "./shared/pages/LoadingScreen";
import LandingPage from "./landing/LandingPage";
import StudentOnboarding from "./student/pages/StudentOnboarding";
import DashboardMenu from "./shared/pages/DashboardMenu";
import OrganizationProjects from "./organization/pages/OrganizationProjects";
import ProjectProblemInfo from "./organization/pages/ProjectProblemInfo";
import DynamicProjectDiscovery from "./organization/components/DynamicProjectDiscovery";
import ProjectProposal from "./organization/pages/ProjectProposal";
import ProjectWorkspace from "./organization/pages/ProjectWorkspace";
import OrganizationProjectOverview from "./organization/pages/OrganizationProjectOverview";
import LeadingProjects from "./student/pages/LeadingProjects";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminProjectReview from "./admin/pages/AdminProjectReview";
import AdminUsers from "./admin/pages/AdminUsers";
import ProjectPlanWorkspace from "./shared/pages/ProjectPlanWorkspace";
import StudentApplications from "./student/pages/StudentApplications";
import StudentProjects from "./student/pages/StudentProjects";
import StudentEvidence from "./student/pages/StudentEvidence";
import ProjectExecutionWorkspace from "./shared/pages/ProjectExecutionWorkspace";
import { AuthProvider } from "./shared/auth/AuthProvider";
import {
  AdminRoute,
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
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        {/* مسار بديل لنفس صفحة إكمال تسجيل الدخول عبر Google */}
        <Route path="/auth/callback" element={<GoogleCallback />} />

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
              <Route path="/student/assessment" element={<StudentAssessments />} />
              <Route
                path="/student/assessment/sessions/:sessionId"
                element={<StudentAssessmentSession />}
              />
              <Route path="/student/opportunities" element={<StudentOpportunities />} />
              <Route
                path="/student/opportunities/:id"
                element={<StudentOpportunityDetails />}
              />
              <Route path="/student/applications" element={<StudentApplications />} />
              <Route path="/student/projects" element={<StudentProjects />} />
              <Route path="/student/projects/:projectId" element={<ProjectExecutionWorkspace />} />
              <Route path="/student/evidence" element={<StudentEvidence />} />
              {/* قيادة الفريق: الصلاحية الفعلية من الخادم (تعيين ساري من إدارة المنصة) */}
              <Route path="/student/leading" element={<LeadingProjects />} />
              <Route path="/student/leading/:projectId" element={<ProjectWorkspace />} />
              <Route
                path="/student/profile"
                element={<UpdateStudentProfile />}
              />
            </Route>
          </Route>

          {/* إدارة المنصة */}
          <Route element={<AdminRoute />}>
            <Route element={<DashboardMenu />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/projects/:projectId" element={<AdminProjectReview />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>

          {/* مساحة الخطة المشتركة: القائد والمؤسسة ومدير المنصة؛ الخادم يحدد الصفة والصلاحيات */}
          <Route element={<DashboardMenu />}>
            <Route path="/projects/:projectId/plan" element={<ProjectPlanWorkspace />} />
            <Route path="/projects/:projectId/execution" element={<ProjectExecutionWorkspace />} />
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
                path="/organization/requests/new/problem"
                element={<ProjectProblemInfo />}
              />
              <Route
                path="/organization/requests/:id/problem"
                element={<ProjectProblemInfo />}
              />
              <Route
                path="/organization/requests/:id"
                element={<ProjectProposal />}
              />
              <Route
                path="/organization/requests/:id/intake"
                element={<DynamicProjectDiscovery />}
              />
              <Route
                path="/organization/requests/:id/proposal"
                element={<ProjectProposal />}
              />
              <Route
                path="/organization/requests/:id/review"
                element={<ProjectProposal />}
              />
              <Route
                path="/organization/projects/:projectId"
                element={<OrganizationProjectOverview />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
