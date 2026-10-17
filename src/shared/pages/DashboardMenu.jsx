import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { FaSignOutAlt, FaSearch, FaUserCircle } from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";
import { Award, Briefcase, Building2, ClipboardCheck, Crown, FileCheck2, FolderKanban, LayoutDashboard, Plus, UserRound, Users } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { showAlert, Swal } from "../utils/alerts";
import logo from "../assets/logo.svg";
import "../styles/DashboardMenu.css";

function DashboardMenu() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isOrganizationProfile = pathname.startsWith("/organization/profile");
  const userName = user?.name?.trim() || "";
  const dashboardPath =
    user?.role === "organization"
      ? "/organization/dashboard"
      : user?.role === "admin"
        ? "/admin/dashboard"
        : "/student/dashboard";

  const handleLogout = async () => {
    if (isLoggingOut) return;

    const result = await showAlert({
      icon: "question",
      title: "هل تريد تسجيل الخروج؟",
      text: "ستحتاج إلى تسجيل الدخول مرة أخرى للوصول إلى حسابك.",
      showCancelButton: true,
      confirmButtonText: "تسجيل الخروج",
      cancelButtonText: "إلغاء",
      focusCancel: true,
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      // logout يمسح الجلسة محليًا حتى لو فشل طلب الخادم
      preConfirm: async () => {
        setIsLoggingOut(true);
        await logout();
        return true;
      },
    });

    if (result.isConfirmed) navigate("/", { replace: true });
  };

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">
            <span className="brand-go">Go</span>
            <span className="brand-trainee">Trainee</span>
          </span>
          <img src={logo} alt="GoTrainee Logo" className="sidebar-logo-icon" />
        </div>

        <p className="sidebar-section-label">القائمة الرئيسية</p>

        <nav className="sidebar-nav">
          {user?.role === "organization" && (
            <NavLink
              to="/organization/requests/new"
              className="sidebar-create-project"
            >
              <Plus size={16} aria-hidden="true" />
              <span>مشروع جديد</span>
            </NavLink>
          )}
          <NavLink
            to={dashboardPath}
            end
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
            }
          >
            <span className="sidebar-link-icon">
              <LayoutDashboard size={18} className="text-gray-700" />
            </span>
            <span>لوحة التحكم</span>
          </NavLink>
          {user?.role === "student" && (
            <NavLink
              to="/student/profile"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <FaUserCircle />
              </span>
              <span>الملف الشخصي</span>
            </NavLink>
          )}
          {user?.role === "student" && (
            <NavLink
              to="/student/assessment"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <ClipboardCheck size={18} aria-hidden="true" />
              </span>
              <span>تقييم المهارات</span>
            </NavLink>
          )}
          {user?.role === "student" && (
            <NavLink
              to="/student/opportunities"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <Briefcase size={18} aria-hidden="true" />
              </span>
              <span>فرص المشاريع</span>
            </NavLink>
          )}
          {user?.role === "student" && (
            <NavLink
              to="/student/applications"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <FileCheck2 size={18} aria-hidden="true" />
              </span>
              <span>طلباتي</span>
            </NavLink>
          )}
          {user?.role === "student" && (
            <NavLink
              to="/student/projects"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <FolderKanban size={18} aria-hidden="true" />
              </span>
              <span>مشاريعي</span>
            </NavLink>
          )}
          {user?.role === "student" && (
            <NavLink
              to="/student/evidence"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <Award size={18} aria-hidden="true" />
              </span>
              <span>سجل الخبرة</span>
            </NavLink>
          )}
          {user?.role === "student" && user?.leading_projects_count > 0 && (
            <NavLink
              to="/student/leading"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <Crown size={18} aria-hidden="true" />
              </span>
              <span>مشاريع أقودها</span>
            </NavLink>
          )}
          {user?.role === "admin" && (
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <Users size={18} aria-hidden="true" />
              </span>
              <span>الحسابات</span>
            </NavLink>
          )}
          {user?.role === "organization" && (
            <NavLink
              to="/organization/requests"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <Building2 size={18} aria-hidden="true" />
              </span>
              <span>طلبات المشاريع</span>
            </NavLink>
          )}
          {user?.role === "organization" && (
            <NavLink
              to="/organization/profile"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              <span className="sidebar-link-icon">
                <UserRound size={18} aria-hidden="true" />
              </span>
              <span>الملف التعريفي</span>
            </NavLink>
          )}
        </nav>

        <button
          className="sidebar-logout"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <FaSignOutAlt className="sidebar-link-icon" />
          <span>{isLoggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}</span>
        </button>
      </aside>

      <div className="app-main">
        {pathname !== "/student/profile" && (
          <header
            className={`app-topbar ${isOrganizationProfile ? "app-topbar-profile" : ""}`}
          >
            {!isOrganizationProfile && (
              <div className="topbar-search">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="ابحث عن الدورات، التدريبات، المشرفين..."
                />
                <FaSearch className="topbar-search-icon" />
              </div>
            )}

            <NotificationBell />

            {!isOrganizationProfile && (
              <div className="topbar-user">
                <div className="topbar-avatar">{userName.charAt(0)}</div>
                <span className="topbar-username">{userName}</span>
              </div>
            )}
          </header>
        )}

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardMenu;
