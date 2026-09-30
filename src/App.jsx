import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentProfile from "./pages/StudentProfile";
import OrganizationProfile from "./pages/OrganizationProfile";
import MatchingLoading from "./pages/MatchingLoading";
import PublicLayout from "./components/common/PublicLayout";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/student/profile" element={<StudentProfile />} />
      <Route path="/organization/profile" element={<OrganizationProfile />} />
      <Route path="/student/matching" element={<MatchingLoading />} />

      <Route element={<PublicLayout />}>
        <Route path="/" element={<div>الصفحة الرئيسية</div>} />
        <Route path="/opportunities" element={<div>الفرص</div>} />
      </Route>
    </Routes>
  );
}

export default App;