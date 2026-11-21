import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { Loading } from "./components/ui.jsx";
import { useSite } from "./lib/SiteContext.jsx";
import About from "./pages/About.jsx";
import Activities from "./pages/Activities.jsx";
import Gallery from "./pages/Gallery.jsx";
import Give from "./pages/Give.jsx";
import Home from "./pages/Home.jsx";
import Ministries from "./pages/Ministries.jsx";
import NotFound from "./pages/NotFound.jsx";
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
            <p>We couldn’t load the website right now.</p>
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
      <Route element={<PublicSite />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="activities" element={<Activities />} />
        <Route path="ministries" element={<Ministries />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="visit" element={<Visit />} />
        <Route path="give" element={<Give />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
