import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  Check,
  CirclePlay,
  Clock3,
  HandHeart,
  Heart,
  HeartHandshake,
  MapPin,
  Mic2,
  Music2,
  Radio,
  Sparkles,
  Sprout,
  Users,
} from "lucide-react";
import ActivityCard from "../components/ActivityCard.jsx";
import { pageHeading } from "../lib/pageText.js";
import { PhotoGrid } from "./Gallery.jsx";
import { ArrowLink, VideoEmbed } from "../components/ui.jsx";
import {
  cssUrl,
  embedUrl,
  formatDate,
  formatTime,
  liveEmbed,
  mapEmbedSrc,
  safeUrl,
  splitActivities,
  photoOrFallback,
  upcomingSessions,
} from "../lib/format.js";
import { useSermons, useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

const pathways = [
  { number: "01", title: "New here?", description: "Your first visit should feel easy. We’d love to meet you.", to: "/visit", action: "Plan a visit", Icon: Sparkles },
  { number: "02", title: "Cell groups", description: "Faith grows in community. Join a cell group near you, Wednesday to Friday.", to: "/ministries", action: "Find a cell group", Icon: Users },
  { number: "03", title: "Watch online", description: "Join our services live or catch up on previous messages.", to: "/services", action: "Watch now", Icon: Radio },
  { number: "04", title: "Giving", description: "Be part of the good happening in our church and city.", to: "/give", action: "Discover giving", Icon: HandHeart },
];

function Hero({ settings, live, nextSession }) {
  const service = settings.serviceTimes[0];
  const heroImage = cssUrl(settings.heroImage);
  const heading = pageHeading(settings, "home", { title: "Find your", accent: "place to grow.", intro: settings.tagline });
  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className="hero__photo" aria-hidden="true" style={heroImage ? { backgroundImage: heroImage } : undefined} />
      <div className="hero__veil" aria-hidden="true" />
      <div className="hero__inner">
        <div className="hero__content">
          <p className="eyebrow eyebrow--light">
            <span className="eyebrow__line" />
            {settings.name}
            {settings.location && (
              <>
                {" "}
                <span className="eyebrow__dot">·</span> {settings.location}
              </>
            )}
          </p>
          <h1 id="hero-title">
            {heading.title}
            <br />
            <em>{heading.accent}</em>
          </h1>
          <p className="hero__intro">{heading.intro}</p>
          <div className="hero__actions">
            {live.isLive ? (
              <Link className="button button--cream" to="/services">
                <span className="live-dot" aria-hidden="true" /> Watch live now
              </Link>
            ) : (
              <Link className="button button--cream" to="/visit">
                Plan a visit <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            )}
            <Link className="hero__watch" to="/services#messages">
              <span className="hero__play">
                <CirclePlay size={22} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span>Previous messages</span>
            </Link>
          </div>
        </div>
        <div className="hero__side-note">
          <span className="hero__side-rule" />
          <span>Rooted in love. Growing together.</span>
        </div>
        <a className="hero__scroll" href="#welcome" aria-label="Scroll to discover">
          <span>Discover our church</span>
          <ArrowDown size={15} aria-hidden="true" />
        </a>
        {settings.location && (
          <div className="hero__location">
            <MapPin size={15} aria-hidden="true" />
            <span>{settings.location}</span>
          </div>
        )}
      </div>
      <Link className="hero__service" to={nextSession ? "/services" : "/visit"}>
        <span className="hero__service-icon">
          <Clock3 size={19} aria-hidden="true" />
        </span>
        <span>
          <span className="hero__service-label">{nextSession ? `Next: ${nextSession.title}` : "Gather with us"}</span>
          <span className="hero__service-time">
            {nextSession
              ? nextSession.inProgress
                ? "Happening now"
                : `${formatDate(nextSession.startsAt, { weekday: true, year: false })} · ${formatTime(nextSession.startsAt)}`
              : service
                ? `${service.day} · ${service.time}`
                : "Details coming soon"}
          </span>
        </span>
        <span className="hero__service-arrow">
          <ArrowUpRight size={17} aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}

function Welcome({ settings }) {
  return (
    <section className="welcome section-pad" id="welcome">
      <div className="welcome__label">
        <span className="section-number">01 / A PLACE TO BELONG</span>
        <span className="welcome__stem" />
      </div>
      <div className="welcome__copy">
        <h2>
          Church is more
          <br />
          than a <em>Sunday.</em>
        </h2>
        <div className="welcome__bottom">
          <p>
            It’s finding your people, discovering what you were made for, and knowing you don’t have to walk alone.
            Whatever your story, there’s room to grow here.
          </p>
          <ArrowLink to="/about">A little about us</ArrowLink>
        </div>
      </div>
      <div className="welcome__visual">
        <img
          src="/photos/church-family.jpg"
          alt="Our church family gathered together"
          loading="lazy"
        />
        <span className="welcome__stamp" aria-hidden="true">
          <img src={safeUrl(settings.logoUrl) || "/logo.png"} alt="" className="welcome__stamp-logo" />
          <span>Rooted in love</span>
          <span>Growing together</span>
        </span>
      </div>
    </section>
  );
}

function Pathways() {
  return (
    <section className="pathways section-pad" id="about">
      <div className="section-heading">
        <div>
          <span className="section-number">02 / YOUR NEXT STEP</span>
          <h2>
            All you need to <em>know.</em>
          </h2>
        </div>
        <p>Wherever you are in your journey, you can take a next step here.</p>
      </div>
      <div className="pathway-grid">
        {pathways.map(({ Icon, ...pathway }) => (
          <Link className="pathway-card" to={pathway.to} key={pathway.number}>
            <span className="pathway-card__top">
              <span className="pathway-card__number">{pathway.number}</span>
              <span className="pathway-card__icon">
                <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
              </span>
            </span>
            <span className="pathway-card__title">{pathway.title}</span>
            <span className="pathway-card__description">{pathway.description}</span>
            <span className="pathway-card__action">
              {pathway.action}
              <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Scripture() {
  return (
    <section className="scripture section-pad" aria-labelledby="scripture-title">
      <div className="scripture__inner">
        <span className="scripture__ornament" aria-hidden="true">
          <Sprout size={22} strokeWidth={1.4} />
        </span>
        <h2 id="scripture-title" className="sr-only">
          Our name
        </h2>
        <blockquote>
          <p>
            “I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth{" "}
            <em>much fruit.</em>”
          </p>
          <footer>John 15:5</footer>
        </blockquote>
      </div>
    </section>
  );
}

function Message({ site }) {
  const { sermons, loading } = useSermons();
  const liveSrc = liveEmbed(site.live, site.settings, site.youtube);
  const latest = sermons[0];

  return (
    <section className="message" id="message">
      <div className="message__image message__image--video">
        {liveSrc ? (
          <VideoEmbed src={liveSrc} title={site.live.title || "Live service"} />
        ) : latest ? (
          <VideoEmbed src={embedUrl(latest.videoId, { autoplay: true })} title={latest.title} thumbnail={latest.thumbnail} />
        ) : (
          <>
            <img
              src="/photos/sunday-service.jpg"
              alt="A Sunday service at Vine India"
              loading="lazy"
            />
            <div className="message__image-overlay" />
            <div className="message__play">
              <CirclePlay size={42} strokeWidth={1.2} aria-hidden="true" />
              <span>{loading ? "Loading messages…" : "Messages will appear here soon"}</span>
            </div>
            <span className="message__image-caption">
              <AudioLines size={14} aria-hidden="true" /> A MOMENT TO PAUSE
            </span>
          </>
        )}
      </div>
      <div className="message__content">
        <span className="section-number section-number--light">03 / WORDS FOR THE JOURNEY</span>
        <span className="message__ornament" aria-hidden="true">
          <Music2 size={20} strokeWidth={1.5} />
        </span>
        <h2>
          {liveSrc ? "We’re live" : "A little"}
          <br />
          <em>{liveSrc ? "right now." : "encouragement."}</em>
        </h2>
        <p>
          {liveSrc
            ? site.live.description || "Join our service live from wherever you are."
            : "Make space for a moment of hope, wherever you are. Watch our latest message or browse the library."}
        </p>
        <div className="message__divider" />
        <div className="message__speaker">
          <span className="message__speaker-icon">
            <Mic2 size={17} aria-hidden="true" />
          </span>
          <span>
            <span className="message__speaker-label">{liveSrc ? "Live now" : "Latest message"}</span>
            <span className="message__speaker-name">{liveSrc ? site.live.title : latest?.title || site.settings.name}</span>
          </span>
          {!liveSrc && latest?.date && <span className="message__duration">{formatDate(latest.date)}</span>}
        </div>
        <Link className="button button--cream message__cta" to="/services#messages">
          All messages <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function Visit({ settings }) {
  const sundays = settings.serviceTimes.filter((s) => /sunday/i.test(s.day));
  const shown = (sundays.length ? sundays : settings.serviceTimes).slice(0, 3);
  return (
    <section className="visit section-pad" id="visit">
      <div className="visit__intro">
        <span className="section-number">04 / WE’LL SAVE YOU A SEAT</span>
        <h2>
          Your first Sunday?
          <br />
          <em>We’ve got you.</em>
        </h2>
        <p>Come just as you are. We’ll help you find your way, meet a few friendly faces, and settle in at your own pace.</p>
        <div className="visit__promises">
          <span>
            <Check size={15} aria-hidden="true" /> Come as you are
          </span>
          <span>
            <Check size={15} aria-hidden="true" /> Bring the whole family
          </span>
          <span>
            <Check size={15} aria-hidden="true" /> We’ll help you find us
          </span>
        </div>
        {shown.map((service, index) => (
          <div className="visit__service" key={index}>
            <div className="visit__service-icon">
              <CalendarDays size={20} aria-hidden="true" />
            </div>
            <div>
              <span className="visit__service-title">
                {service.day} · {service.time}
              </span>
              <span className="visit__service-copy">{service.place || service.label}</span>
            </div>
          </div>
        ))}
        <ArrowLink to="/visit">Visit details & contact</ArrowLink>
      </div>
      <MapCard settings={settings} />
    </section>
  );
}

export function MapCard({ settings }) {
  const mapSrc = mapEmbedSrc(settings.mapEmbedUrl);
  const directions = safeUrl(settings.mapDirectionsUrl);
  return (
    <div className="visit__map-wrap">
      <div className="visit__map-label">
        <span className="visit__map-pin">
          <MapPin size={16} aria-hidden="true" />
        </span>
        <span>
          <strong>Find us</strong>
          <span>{settings.address || settings.location}</span>
        </span>
      </div>
      {mapSrc ? (
        <iframe
          className="visit__map"
          src={mapSrc}
          title={`Map showing ${settings.name}`}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="visit__map visit__map--empty">Map coming soon</div>
      )}
      {directions && (
        <a className="visit__directions" href={directions} target="_blank" rel="noreferrer">
          Open directions <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function Ministries({ ministries }) {
  if (!ministries.length) return null;
  return (
    <section className="ministries section-pad" id="ministries">
      <div className="section-heading">
        <div>
          <span className="section-number">05 / THERE’S A PLACE FOR YOU</span>
          <h2>
            Life is better <em>together.</em>
          </h2>
        </div>
        <p>Different ages, stories and seasons. One community, growing together.</p>
      </div>
      <div className="ministry-grid">
        {ministries.slice(0, 4).map((ministry, index) => (
          <Link className="ministry-card" key={ministry.id} to={`/ministries#${ministry.id}`}>
            <div className="ministry-card__image">
              <img src={photoOrFallback(ministry.image, index)} alt="" loading="lazy" decoding="async" />
              <span className="ministry-card__index">0{index + 1}</span>
              <span className="ministry-card__arrow">
                <ArrowUpRight size={17} aria-hidden="true" />
              </span>
            </div>
            <div className="ministry-card__copy">
              <span className="ministry-card__category">{ministry.category}</span>
              <h3>{ministry.title}</h3>
              <p>{ministry.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Events({ activities }) {
  const { upcoming } = splitActivities(activities);
  const featured = [...upcoming.filter((a) => a.featured), ...upcoming.filter((a) => !a.featured)].slice(0, 3);
  if (!featured.length) return null;
  return (
    <section className="events section-pad" id="events">
      <div className="section-heading">
        <div>
          <span className="section-number">06 / MAKE A LITTLE SPACE</span>
          <h2>
            Good things are <em>growing.</em>
          </h2>
        </div>
        <div>
          <p>Make a date for meaningful moments, good people, and life together.</p>
          <ArrowLink to="/activities">All church activities</ArrowLink>
        </div>
      </div>
      <div className="event-grid">
        {featured.map((activity, index) => (
          <ActivityCard key={activity.id} activity={activity} index={index} />
        ))}
      </div>
    </section>
  );
}

function GalleryPreview({ gallery }) {
  if (!gallery.length) return null;
  return (
    <section className="gallery gallery--home section-pad">
      <div className="section-heading">
        <div>
          <span className="section-number">07 / LIFE AT THE VINE</span>
          <h2>
            Faith, family <em>& fellowship.</em>
          </h2>
        </div>
        <div>
          <p>Sundays, cell groups, prayer and celebrations — a glimpse of our church family.</p>
          <ArrowLink to="/gallery">See all photos</ArrowLink>
        </div>
      </div>
      <PhotoGrid photos={gallery} limit={6} />
    </section>
  );
}

function Giving() {
  return (
    <section className="giving" id="giving">
      <div className="giving__image" aria-hidden="true" />
      <div className="giving__content">
        <span className="section-number section-number--light">08 / GENEROSITY THAT GROWS</span>
        <span className="giving__icon">
          <HeartHandshake size={24} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <h2>
          Love grows
          <br />
          when we <em>give.</em>
        </h2>
        <p>Generosity helps create a place to belong, care for one another, and bring hope to our community.</p>
        <Link className="button button--cream giving__button" to="/give">
          Ways to give <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="giving__seal" aria-hidden="true">
        <span>Give</span>
        <Heart size={17} />
        <span>Grow</span>
      </div>
    </section>
  );
}

export default function Home() {
  usePageTitle("");
  const { site } = useSite();
  const nextSession = upcomingSessions(site.sessions)[0];
  return (
    <>
      <Hero settings={site.settings} live={site.live} nextSession={nextSession} />
      <Welcome settings={site.settings} />
      <Pathways />
      <Scripture />
      <Message site={site} />
      <Visit settings={site.settings} />
      <Ministries ministries={site.ministries} />
      <Events activities={site.activities} />
      <GalleryPreview gallery={site.gallery || []} />
      <Giving />
    </>
  );
}
