import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { Loading } from "./components/ui.jsx";
import { useSite } from "./lib/SiteContext.jsx";
import { authRedirect } from "./lib/supabase.js";
import About from "./pages/About.jsx";
import Activities from "./pages/Activities.jsx";
import Gallery from "./pages/Gallery.jsx";
import Give from "./pages/Give.jsx";
import Home from "./pages/Home.jsx";
import Ministries from "./pages/Ministries.jsx";
import NotFound from "./pages/NotFound.jsx";
import Privacy from "./pages/Privacy.jsx";
import Services from "./pages/Services.jsx";
import Visit from "./pages/Visit.jsx";

const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

function PublicSite() {
  const { site, error, refresh } = useSite();
  if (!site) {
    return (
      <div className="boot-screen">
        {error ? (
          <>
            <p>We couldn’t load the website right now. Please check your internet connection.</p>
            <button className="button" type="button" onClick={refresh}>
              Try again
            </button>
          </>
        ) : (
          <Loading />
        )}
      </div>
    );
  }
  return <Layout />;
}

export default function App() {
  const { pathname } = useLocation();
  // Invite and password-reset emails may land on the home page: send them to the sign-in page.
  const onAccountPage = pathname.startsWith("/admin") || pathname.startsWith("/account");
  if ((authRedirect.type === "invite" || authRedirect.type === "recovery" || authRedirect.error) && !onAccountPage) {
    return <Navigate to={`/account${window.location.hash}`} replace />;
  }
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<div className="boot-screen"><Loading /></div>}>
            <AdminApp />
          </Suspense>
        }
      />
      {/* Sign-in for church members and admins (members land on their own page here). */}
      <Route
        path="/account/*"
        element={
          <Suspense fallback={<div className="boot-screen"><Loading /></div>}>
            <AdminApp portal />
          </Suspense>
        }
      />
      <Route element={<PublicSite />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="activities" element={<Activities />} />
        <Route path="ministries" element={<Ministries />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="visit" element={<Visit />} />
        <Route path="give" element={<Give />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
