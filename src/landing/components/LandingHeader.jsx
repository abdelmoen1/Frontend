import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../../shared/assets/logo.svg";
import { useAuth } from "../../shared/auth/useAuth";
import { getUserDestination } from "../../shared/auth/destination";
import { header, ROUTES } from "../content";
import { CtaLink } from "./shared";

// navItems: روابط الأقسام المفعّلة فقط (يمررها LandingPage)
export default function LandingHeader({ navItems }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`lp-header ${open ? "is-open" : ""}`}>
      <div className="lp-container lp-header-inner">
        <Link to="/" className="lp-logo" aria-label={header.homeLabel}>
          <img src={logo} alt="" width="130" height="91" />
          <span className="lp-wordmark" dir="ltr" aria-hidden="true">
            <span className="lp-wordmark-go">Go</span>Trainee
          </span>
        </Link>

        <button
          type="button"
          className="lp-menu-toggle"
          aria-expanded={open}
          aria-controls="lp-menu"
          aria-label={open ? header.closeMenu : header.openMenu}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>

        <div className="lp-menu" id="lp-menu">
          <nav aria-label="أقسام الصفحة">
            <ul className="lp-nav">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a href={item.href} onClick={close}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="lp-header-actions">
            {user ? (
              <CtaLink to={getUserDestination(user)} onClick={close}>
                {header.account}
              </CtaLink>
            ) : (
              <>
                <CtaLink to={ROUTES.login} variant="ghost" onClick={close}>
                  {header.login}
                </CtaLink>
                <CtaLink to={ROUTES.register} onClick={close}>
                  {header.register}
                </CtaLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
