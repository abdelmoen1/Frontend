import { Link } from "react-router-dom";
import logo from "../../shared/assets/logo.svg";
import { BRAND, footer } from "../content";

// sectionIds: الأقسام المفعّلة؛ روابط أقسام معطّلة لا تظهر
export default function LandingFooter({ sectionIds }) {
  const visible = (link) => !link.href || sectionIds.includes(link.href.slice(1));

  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-grid">
        <div className="lp-footer-brand">
          <span className="lp-logo">
            <img src={logo} alt="" width="130" height="91" />
            <span className="lp-wordmark" dir="ltr">
              <span className="lp-wordmark-go">Go</span>Trainee
            </span>
          </span>
          <p>{footer.tagline}</p>
        </div>
        {footer.groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            <ul>
              {group.links.filter(visible).map((link) => (
                <li key={link.label}>
                  {link.to ? <Link to={link.to}>{link.label}</Link> : <a href={link.href}>{link.label}</a>}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="lp-container lp-footer-bottom">
        <small>
          © {new Date().getFullYear()} {BRAND.name}. {footer.rights}
        </small>
      </div>
    </footer>
  );
}
