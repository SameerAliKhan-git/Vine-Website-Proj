import { useState } from "react";
import ActivityCard from "../components/ActivityCard.jsx";
import { PageHero } from "../components/ui.jsx";
import { splitActivities } from "../lib/format.js";
import { useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

export default function Activities() {
  usePageTitle("Church activities");
  const { activities } = useSite().site;
  const { upcoming, past } = splitActivities(activities);
  const categories = ["All", ...new Set(upcoming.map((a) => a.category).filter(Boolean))];
  const [category, setCategory] = useState("All");
  const shown = category === "All" ? upcoming : upcoming.filter((a) => a.category === category);

  return (
    <>
      <PageHero eyebrow="CHURCH ACTIVITIES · WHAT’S ON" title="Good things are" accent="growing.">
        Gatherings, outreach, fellowship and celebrations — there’s always a way to get involved.
      </PageHero>
      <section className="events section-pad">
        {categories.length > 2 && (
          <div className="filter-chips" role="group" aria-label="Filter activities">
            {categories.map((c) => (
              <button key={c} type="button" className={c === category ? "chip chip--active" : "chip"} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        {shown.length ? (
          <div className="event-grid event-grid--page">
            {shown.map((activity, index) => (
              <ActivityCard key={activity.id} activity={activity} index={index} />
            ))}
          </div>
        ) : (
          <p className="empty-state">New activities will be announced soon. Check back shortly!</p>
        )}
      </section>
      {past.length > 0 && (
        <section className="events events--past section-pad">
          <div className="section-heading">
            <div>
              <span className="section-number">LOOKING BACK</span>
              <h2>
                Past <em>activities.</em>
              </h2>
            </div>
          </div>
          <div className="event-grid event-grid--page">
            {past.slice(0, 9).map((activity, index) => (
              <ActivityCard key={activity.id} activity={activity} index={index} past />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
