import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle.js";

export default function NotFound() {
  usePageTitle("Page not found");
  return (
    <section className="not-found section-pad">
      <span className="section-number">404</span>
      <h1>
        This page has <em>wandered off.</em>
      </h1>
      <p>The page you’re looking for doesn’t exist or has moved.</p>
      <Link className="button" to="/">
        Back to home
      </Link>
    </section>
  );
}
