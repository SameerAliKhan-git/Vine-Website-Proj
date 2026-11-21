import { Check, Compass, Eye, UserRound } from "lucide-react";
import { ArrowLink, PageHero } from "../components/ui.jsx";
import { useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

export default function About() {
  usePageTitle("About us");
  const { settings, leaders } = useSite().site;
  return (
    <>
      <PageHero eyebrow="ABOUT US · OUR STORY" title="Rooted in love," accent="growing together.">
        {settings.tagline}
      </PageHero>

      <section className="about-story section-pad">
        <div>
          <span className="section-number">OUR STORY</span>
          <h2>
            Who we <em>are.</em>
          </h2>
        </div>
        <div className="prose">
          {settings.aboutStory.split(/\n+/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          <ArrowLink to="/visit">Plan your first visit</ArrowLink>
        </div>
      </section>

      <section className="about-pillars section-pad">
        <article>
          <span className="pillar-icon">
            <Compass size={22} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h3>Our mission</h3>
          <p>{settings.aboutMission}</p>
        </article>
        <article>
          <span className="pillar-icon">
            <Eye size={22} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h3>Our vision</h3>
          <p>{settings.aboutVision}</p>
        </article>
      </section>

      {settings.beliefs.length > 0 && (
        <section className="beliefs section-pad">
          <div className="section-heading">
            <div>
              <span className="section-number">WHAT WE BELIEVE</span>
              <h2>
                Our <em>foundations.</em>
              </h2>
            </div>
          </div>
          <ul className="belief-list">
            {settings.beliefs.map((belief, i) => (
              <li key={i}>
                <Check size={17} aria-hidden="true" />
                {belief}
              </li>
            ))}
          </ul>
        </section>
      )}

      {leaders.length > 0 && (
        <section className="leaders section-pad">
          <div className="section-heading">
            <div>
              <span className="section-number">OUR LEADERSHIP</span>
              <h2>
                Meet our <em>team.</em>
              </h2>
            </div>
            <p>The people who serve, shepherd and care for our church family.</p>
          </div>
          <div className="leader-grid">
            {leaders.map((leader) => (
              <article className="leader-card" key={leader.id}>
                <div className="leader-card__photo">
                  {leader.photo ? <img src={leader.photo} alt={leader.name} loading="lazy" /> : <UserRound size={48} strokeWidth={1} aria-hidden="true" />}
                </div>
                <h3>{leader.name}</h3>
                <span className="leader-card__role">{leader.role}</span>
                {leader.bio && <p>{leader.bio}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
