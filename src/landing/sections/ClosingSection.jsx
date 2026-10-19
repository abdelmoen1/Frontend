import { ArrowLeft } from "lucide-react";
import { closing } from "../content";
import { CtaLink } from "../components/shared";
import { Reveal } from "../components/Reveal";
import { PuzzleArt } from "../components/Illustrations";
import { trackPointer } from "../motion";

// لوحة ختامية بحافة ضوئية متحركة، وقطعتان تتكاملان (المؤسسة بالمشكلة والطالب بالمهارة)
export default function ClosingSection() {
  return (
    <section className="lp-section lp-section-tight" id={closing.id} aria-labelledby="lp-closing-title">
      <div className="lp-container">
        <Reveal className="lp-closing lp-beam" onPointerMove={trackPointer}>
          <span className="lp-closing-light" aria-hidden="true" />
          <div className="lp-closing-art">
            <PuzzleArt />
          </div>
          <h2 id="lp-closing-title">{closing.title}</h2>
          <p>{closing.text}</p>
          <div className="lp-closing-actions">
            <CtaLink to={closing.primary.to} className="lp-btn-lg">
              {closing.primary.label}
              <ArrowLeft size={18} aria-hidden="true" />
            </CtaLink>
            <CtaLink to={closing.secondary.to} variant="ghost" className="lp-btn-lg">
              {closing.secondary.label}
            </CtaLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
