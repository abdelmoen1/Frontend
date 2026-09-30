import { Link } from "react-router-dom";
import logo from "../../assets/logo.svg";
import "../../Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/">
        <img src={logo} alt="GoTrainee" className="navbar-logo-img" />
      </Link>
      <div className="navbar-links">
        <Link to="/">الرئيسية</Link>
        <Link to="/students">الطلاب</Link>
        <Link to="/organizations">الشركات</Link>
        <Link to="/about">من نحن</Link>
      </div>
     <div className="navbar-actions">
   <Link to="/register" className="navbar-btn-outline">إنشاء حساب</Link>
   <Link to="/login" className="navbar-btn">تسجيل دخول</Link>
 </div>
    </nav>
  );
}

export default Navbar;