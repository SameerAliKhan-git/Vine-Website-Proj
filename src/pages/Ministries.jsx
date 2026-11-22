import { Clock3, UserRound } from "lucide-react";
import { ArrowLink, PageHero } from "../components/ui.jsx";
import { photoOrFallback } from "../lib/format.js";
import { useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

export default function Ministries() {
  usePageTitle("Ministries");
  const { ministries } = useSite().site;
  return (
    <>
      <PageHero page="ministries" image="/gallery/vine-10.webp" eyebrow="MINISTRIES · THERE’S A PLACE FOR YOU" title="Life is better" accent="together.">
        Different ages, stories and seasons. One community, growing together.
      </PageHero>
      <section className="ministry-list section-pad">
        {ministries.length === 0 && <p className="empty-state">Ministry details are coming soon.</p>}
        {ministries.map((ministry, index) => (
          <article className={`ministry-row${index % 2 ? " ministry-row--flip" : ""}`} id={ministry.id} key={ministry.id}>
            <div className="ministry-row__image"><img src={photoOrFallback(ministry.image, index)} alt="" loading="lazy" decoding="async" /></div>
            <div className="ministry-row__copy">
              <span className="section-number">
                {String(index + 1).padStart(2, "0")} / {ministry.category}
              </span>
              <h2>{ministry.title}</h2>
              <p>{ministry.description}</p>
              <div className="ministry-row__meta">
                {ministry.schedule && (
                  <span>
                    <Clock3 size={14} aria-hidden="true" /> {ministry.schedule}
                  </span>
                )}
                {ministry.leader && (
                  <span>
                    <UserRound size={14} aria-hidden="true" /> {ministry.leader}
                  </span>
                )}
              </div>
              <ArrowLink to="/visit#contact-form">Get connected</ArrowLink>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
