import { useState } from "react";
import { capabilities } from "../content";
import { LandingIcon, SectionHeading } from "../components/shared";
import { RevealItem, RevealList } from "../components/Reveal";
import { isWideTile, matchesAudience, trackPointer } from "../motion";
import { DiscoveryArt, MatchArt, ProfileArt } from "../components/Illustrations";

// المفتاح art في content.js يختار الرسم (يظهر في البطاقات العريضة)
const TILE_ART = { discovery: DiscoveryArt, match: MatchArt, profile: ProfileArt };

// ميزات منفذة فعلًا فقط؛ أضف أو احذف عناصر من capabilities.items في content.js.
// شبكة bento غير متماثلة، وأزرار التصفية تُبرز أدوات جهة وتخفّت الباقي (لا تخفيها عن قارئات الشاشة).
export default function CapabilitiesSection() {
  const [filter, setFilter] = useState("all");

  return (
    <section className="lp-section" id={capabilities.id} aria-labelledby="lp-capabilities-title">
      <div className="lp-container">
        <div className="lp-cap-head">
          <SectionHeading
            id="lp-capabilities-title"
            eyebrow={capabilities.eyebrow}
            title={capabilities.title}
            lead={capabilities.lead}
          />
          <div className="lp-filters" role="group" aria-label={capabilities.filterLabel}>
            {capabilities.filters.map((option) => (
              <button
                key={option.id}
                type="button"
                className="lp-filter"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <RevealList className="lp-bento" stagger={0.07}>
          {capabilities.items.map((item, index) => {
            const Art = TILE_ART[item.art];
            return (
            <RevealItem
              key={item.title}
              className={`lp-bento-tile lp-glow ${isWideTile(index) ? "is-wide" : ""}`.trim()}
              data-dim={matchesAudience(item.audience, filter) ? undefined : "true"}
              onPointerMove={trackPointer}
            >
              <div className="lp-bento-inner">
                <div className="lp-feature-top">
                  <span className="lp-icon-tile">
                    <LandingIcon name={item.icon} />
                  </span>
                  <span className={`lp-tag lp-tag-${item.audience}`}>{capabilities.audienceLabels[item.audience]}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                {Art && (
                  <div className="lp-tile-art">
                    <Art />
                  </div>
                )}
              </div>
            </RevealItem>
            );
          })}
        </RevealList>
      </div>
    </section>
  );
}
