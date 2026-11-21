import { useState } from "react";
import { CalendarDays, Check, HeartHandshake, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { PageHero } from "../components/ui.jsx";
import { MapCard } from "./Home.jsx";
import { api } from "../lib/api.js";
import { emailList, mapSearchUrl, phoneList, telHref } from "../lib/format.js";
import { useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

function ContactForm() {
  const prayerPhones = phoneList(useSite().site.settings.prayerPhones);
  const [type, setType] = useState("contact");
  const [status, setStatus] = useState({ state: "idle", message: "" });

  async function onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus({ state: "sending", message: "" });
    try {
      await api.post("/api/contact", { ...data, type });
      form.reset();
      setStatus({
        state: "sent",
        message:
          type === "prayer"
            ? "Thank you. Our prayer team will be praying with you."
            : "Thank you for reaching out! We’ll get back to you soon.",
      });
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  return (
    <form className="contact-form" id="contact-form" onSubmit={onSubmit}>
      <div className="segmented" role="radiogroup" aria-label="What would you like to send?">
        {[
          ["contact", "Get in touch"],
          ["prayer", "Prayer request"],
        ].map(([value, label]) => (
          <button key={value} type="button" role="radio" aria-checked={type === value} className={type === value ? "is-active" : ""} onClick={() => setType(value)}>
            {label}
          </button>
        ))}
      </div>
      <h2>{type === "prayer" ? "How can we pray for you?" : "We’d love to hear from you."}</h2>
      <div className="form-row">
        <label>
          <span>Your name *</span>
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          <span>Phone</span>
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
        </label>
      </div>
      <label>
        <span>Email</span>
        <input name="email" type="email" maxLength={200} autoComplete="email" />
      </label>
      <label>
        <span>{type === "prayer" ? "Your prayer request *" : "Message *"}</span>
        <textarea name="message" required rows={5} maxLength={4000} />
      </label>
      <label className="hp" aria-hidden="true">
        Website <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {type === "prayer" && (
        <p className="form-note">
          Prayer requests are seen only by our pastoral team.
          {prayerPhones.length > 0 && (
            <>
              {" "}You can also call us for prayer:{" "}
              {prayerPhones.map((phone, i) => (
                <span key={phone}>
                  {i > 0 && ", "}
                  <a href={telHref(phone)}>{phone}</a>
                </span>
              ))}
              .
            </>
          )}
        </p>
      )}
      <button className="button" type="submit" disabled={status.state === "sending"}>
        {status.state === "sending" ? "Sending…" : type === "prayer" ? "Send prayer request" : "Send message"}
        <Send size={15} aria-hidden="true" />
      </button>
      {status.message && (
        <p className={`form-status form-status--${status.state}`} role="status">
          {status.state === "sent" && <Check size={15} aria-hidden="true" />} {status.message}
        </p>
      )}
    </form>
  );
}

export default function Visit() {
  usePageTitle("Plan your visit");
  const { settings } = useSite().site;
  const whatsapp = settings.whatsapp.replace(/[^\d]/g, "");
  return (
    <>
      <PageHero eyebrow="PLAN YOUR VISIT · WE’LL SAVE YOU A SEAT" title="Your first Sunday?" accent="We’ve got you.">
        Come just as you are. We’ll help you find your way, meet a few friendly faces, and settle in at your own pace.
      </PageHero>

      <section className="visit visit--page section-pad">
        <div className="visit__intro">
          <span className="section-number">SERVICE TIMES</span>
          <ul className="service-time-list">
            {settings.serviceTimes.map((service, index) => (
              <li key={index}>
                <span className="visit__service-icon">
                  <CalendarDays size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>{service.label || service.day}</strong>
                  <span>
                    {service.day} · {service.time}
                  </span>
                  {service.place && (
                    <a className="service-time-list__place" href={mapSearchUrl(service.place)} target="_blank" rel="noreferrer">
                      <MapPin size={13} aria-hidden="true" /> {service.place}
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <span className="section-number">ADDRESS & CONTACT</span>
          <ul className="contact-list">
            <li>
              <MapPin size={16} aria-hidden="true" /> {settings.address}
            </li>
            {settings.phone && (
              <li>
                <Phone size={16} aria-hidden="true" /> <a href={telHref(settings.phone)}>{settings.phone}</a>
              </li>
            )}
            {phoneList(settings.prayerPhones).length > 0 && (
              <li>
                <HeartHandshake size={16} aria-hidden="true" />
                <span>
                  For prayer:{" "}
                  {phoneList(settings.prayerPhones).map((phone, i) => (
                    <span key={phone}>
                      {i > 0 && ", "}
                      <a href={telHref(phone)}>{phone}</a>
                    </span>
                  ))}
                </span>
              </li>
            )}
            {whatsapp && (
              <li>
                <MessageCircle size={16} aria-hidden="true" />{" "}
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                  Chat on WhatsApp
                </a>
              </li>
            )}
            {emailList(settings.email).map((email) => (
              <li key={email}>
                <Mail size={16} aria-hidden="true" /> <a href={`mailto:${email}`}>{email}</a>
              </li>
            ))}
          </ul>
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
        </div>
        <MapCard settings={settings} />
      </section>

      <section className="contact section-pad">
        <div className="contact__intro">
          <span className="section-number">CONTACT · PRAYER</span>
          <h2>
            Let’s <em>talk.</em>
          </h2>
          <p>Have a question, want to get connected, or need prayer? Send us a note and someone from our team will reach out.</p>
        </div>
        <ContactForm />
      </section>
    </>
  );
}
