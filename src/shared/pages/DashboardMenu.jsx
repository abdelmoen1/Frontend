import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import {
  FaTh,
  FaSignOutAlt,
  FaSearch,
  FaBell,
} from "react-icons/fa";
import { useAuth } from "../auth/useAuth";
import logo from "../assets/logo.svg";
import "../styles/DashboardMenu.css";

function DashboardMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userName = user?.name?.trim() || "";
  const dashboardPath =
    user?.role === "organization"
      ? "/organization/dashboard"
      : "/student/dashboard";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate("/", { replace: true });
    }
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
          <NavLink
            to={dashboardPath}
            end
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
            }
          >
            <span className="sidebar-link-icon">
              <FaTh />
            </span>
            <span>لوحة التحكم</span>
          </NavLink>
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
        <header className="app-topbar">
          <div className="topbar-search">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="ابحث عن الدورات، التدريبات، المشرفين..."
            />
            <FaSearch className="topbar-search-icon" />
          </div>

          <button className="topbar-bell" aria-label="الإشعارات">
            <FaBell />
          </button>

          <div className="topbar-user">
            <div className="topbar-avatar">{userName.charAt(0)}</div>
            <span className="topbar-username">{userName}</span>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardMenu;