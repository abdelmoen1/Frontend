import { ArrowLeft } from "lucide-react";
import { closing } from "../content";
import { CtaLink } from "../components/shared";

export default function ClosingSection() {
  return (
    <section className="lp-section lp-section-tight" id={closing.id} aria-labelledby="lp-closing-title">
      <div className="lp-container">
        <div className="lp-closing">
          <div>
            <h2 id="lp-closing-title">{closing.title}</h2>
            <p>{closing.text}</p>
          </div>
          <div className="lp-closing-actions">
            <CtaLink to={closing.primary.to} variant="light" className="lp-btn-lg">
              {closing.primary.label}
              <ArrowLeft size={18} aria-hidden="true" />
            </CtaLink>
            <CtaLink to={closing.secondary.to} variant="outline-light" className="lp-btn-lg">
              {closing.secondary.label}
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
