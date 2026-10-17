import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../../shared/assets/logo.svg";
import { useAuth } from "../../shared/auth/useAuth";
import { getUserDestination } from "../../shared/auth/destination";
import { header, ROUTES } from "../content";
import { CtaLink, LogoMark } from "./shared";

const isScrolled = () => typeof window !== "undefined" && window.scrollY > 24;

// navItems: روابط الأقسام المفعّلة فقط (يمررها LandingPage). الترويسة شفافة فوق البطل وتصبح زجاجية داكنة عند التمرير.
export default function LandingHeader({ navItems }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(isScrolled);
  const [active, setActive] = useState(navItems[0]?.href || "");
  const { user } = useAuth();
  const hrefs = navItems.map((item) => item.href).join("|");

  useEffect(() => {
    const onScroll = () => setSolid(isScrolled());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // يميّز رابط القسم الظاهر في منتصف الشاشة
  useEffect(() => {
    if (!hrefs || !("IntersectionObserver" in window)) return undefined;
    const targets = hrefs
      .split("|")
      .map((href) => document.getElementById(href.slice(1)))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setActive(`#${visible[0].target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [hrefs]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`lp-header ${solid ? "is-solid" : ""} ${open ? "is-open" : ""}`}>
      <div className="lp-container lp-header-inner">
        <Link to="/" className="lp-logo" aria-label={header.homeLabel}>
          <LogoMark logo={logo} />
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
                  <a href={item.href} onClick={close} aria-current={active === item.href ? "true" : undefined}>
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
                <CtaLink to={ROUTES.login} variant="quiet" onClick={close}>
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
