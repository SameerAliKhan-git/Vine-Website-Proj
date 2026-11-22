import { CalendarDays, Clock3, MapPin, ArrowUpRight } from "lucide-react";
import { cssUrl, formatDate, monthDay, photoOrFallback, safeUrl } from "../lib/format.js";

export default function ActivityCard({ activity, index = 0, past = false }) {
  const md = monthDay(activity.date);
  const image = cssUrl(photoOrFallback(activity.image, index));
  const registrationUrl = safeUrl(activity.registrationUrl);
  return (
    <article className={`event-card${past ? " event-card--past" : ""}`}>
      <div
        className={`event-card__visual event-card__visual--${(index % 3) + 1}${image ? " event-card__visual--image" : ""}`}
        style={image ? { backgroundImage: `linear-gradient(0deg, rgba(14, 18, 48,.55), rgba(14, 18, 48,.1)), ${image}` } : undefined}
      >
        {activity.category && <span className="event-card__category">{activity.category}</span>}
        {md ? (
          <span className="event-card__day">
            <strong>{md.day}</strong>
            <span>{md.month}</span>
          </span>
        ) : (
          <CalendarDays size={27} strokeWidth={1.3} aria-hidden="true" />
        )}
        <span className="event-card__date">{activity.date ? formatDate(activity.date) : "Date coming soon"}</span>
      </div>
      <div className="event-card__copy">
        <h3>{activity.title}</h3>
        <p>{activity.description}</p>
        <div className="event-card__meta">
          {activity.time && (
            <span>
              <Clock3 size={13} aria-hidden="true" /> {activity.time}
            </span>
          )}
          {activity.location && (
            <span>
              <MapPin size={13} aria-hidden="true" /> {activity.location}
            </span>
          )}
        </div>
        {registrationUrl && !past ? (
          <a className="event-card__register" href={registrationUrl} target="_blank" rel="noreferrer">
            Register <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
