import { Link } from "react-router-dom";
import { PageHero } from "../components/ui.jsx";
import { emailList, phoneList } from "../lib/format.js";
import { useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

// Plain-language privacy notice written with India's Digital Personal Data Protection
// Act, 2023 in mind. Church leadership should review it before launch.
export default function Privacy() {
  usePageTitle("Privacy policy");
  const { settings } = useSite().site;
  const email = emailList(settings.email)[0];
  const phone = settings.phone || phoneList(settings.prayerPhones)[0];
  const months = Number(settings.messageRetentionMonths) || 12;

  return (
    <>
      <PageHero page="privacy" image="/gallery/vine-04.webp" eyebrow="PRIVACY · YOUR INFORMATION" title="Your privacy," accent="our care.">
        How {settings.name} handles the information you share through this website.
      </PageHero>
      <section className="privacy prose section-pad">
        <p className="privacy__updated">Last updated: November 2026</p>

        <h2>What we collect</h2>
        <p>
          You can browse this website without telling us who you are. We only collect personal information when you choose
          to send it through the <Link to="/visit#contact-form">contact or prayer request form</Link>:
        </p>
        <ul>
          <li>your name (required),</li>
          <li>your phone number and email address (optional),</li>
          <li>your message or prayer request.</li>
        </ul>
        <p>
          To protect the form from spam we briefly keep a scrambled (one-way hashed) form of your internet address for up to
          24 hours. We do not use advertising or tracking cookies.
        </p>

        <h2>Why we use it</h2>
        <p>
          Only to reply to you, pray with you, and help you connect with our church. We will never sell your information or
          add you to marketing lists. We use it only because you give your consent when you send the form, and you can
          withdraw that consent at any time.
        </p>

        <h2>Who can see it</h2>
        <p>
          Messages are visible only to the small team of church staff who look after this website. Prayer requests are seen
          only by our pastoral team and are kept confidential. Email alerts about new prayer requests do not contain the request
          itself.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Messages and prayer requests are deleted automatically after {months} months, or sooner if you ask us.
        </p>

        <h2>Services we rely on</h2>
        <ul>
          <li>
            <strong>Supabase</strong> hosts our website data in a secure data centre in Mumbai, India.
          </li>
          <li>
            <strong>YouTube</strong> (Google) plays our service videos. Recorded messages only load from YouTube when you press
            play; the live stream loads when you open the Services page while we are live.
          </li>
          <li>
            <strong>Google Maps</strong> shows our location on the Visit page.
          </li>
          <li>
            <strong>Cloudflare Turnstile</strong> may check that the contact form is being used by a person, not a robot.
          </li>
        </ul>

        <h2>Your rights</h2>
        <p>
          You can ask us to show you, correct, or delete the information you have sent us, or ask any question about how it is
          handled. Contact us
          {email && (
            <>
              {" "}
              at <a href={`mailto:${email}`}>{email}</a>
            </>
          )}
          {phone && <> or call {phone}</>}, and we will respond as soon as we can. If you are not satisfied with our response,
          you may contact the Data Protection Board of India.
        </p>

        <h2>Children</h2>
        <p>
          If you are under 18, please ask a parent or guardian before sending us your details through this website.
        </p>
      </section>
    </>
  );
}
