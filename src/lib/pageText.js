// The big heading at the top of each page. Admins can change any of it in the admin
// panel (Page headings); anything left empty falls back to the wording below.
export const PAGE_HEADINGS = [
  { page: "home", label: "Home page", title: "Find your", accent: "place to grow.", intro: "(uses the church tagline)", noEyebrow: true },
  { page: "about", label: "About", eyebrow: "ABOUT US · OUR STORY", title: "Rooted in love,", accent: "growing together.", intro: "(uses the church tagline)", image: "/gallery/vine-24.webp" },
  { page: "services", label: "Services", eyebrow: "SERVICES · WATCH & WORSHIP", title: "Worship with us,", accent: "wherever you are.", intro: "Join our services in person or online. Watch live, see what’s coming up, and catch up on previous messages.", image: "/gallery/vine-09.webp" },
  { page: "activities", label: "Activities", eyebrow: "CHURCH ACTIVITIES · WHAT’S ON", title: "Good things are", accent: "growing.", intro: "Gatherings, outreach, fellowship and celebrations — there’s always a way to get involved.", image: "/gallery/vine-33.webp" },
  { page: "ministries", label: "Ministries", eyebrow: "MINISTRIES · THERE’S A PLACE FOR YOU", title: "Life is better", accent: "together.", intro: "Different ages, stories and seasons. One community, growing together.", image: "/gallery/vine-10.webp" },
  { page: "gallery", label: "Gallery", eyebrow: "GALLERY · LIFE AT THE VINE", title: "Moments of", accent: "faith & family.", intro: "Sundays, cell groups, prayer, children and celebrations — a glimpse of our church family.", image: "/photos/church-family.jpg" },
  { page: "visit", label: "Plan your visit", eyebrow: "PLAN YOUR VISIT · WE’LL SAVE YOU A SEAT", title: "Your first Sunday?", accent: "We’ve got you.", intro: "Come just as you are. We’ll help you find your way, meet a few friendly faces, and settle in at your own pace.", image: "/gallery/vine-03.webp" },
  { page: "give", label: "Give", eyebrow: "GIVING · GENEROSITY THAT GROWS", title: "Love grows when we", accent: "give.", intro: "(uses the giving introduction from Site settings)", image: "/gallery/vine-02.webp" },
];

const filled = (value) => (typeof value === "string" && value.trim() ? value.trim() : "");

/** The admin's wording for a page heading, falling back to the built-in text. */
export function pageHeading(settings, page, defaults) {
  const custom = (settings?.pageText && typeof settings.pageText === "object" && settings.pageText[page]) || {};
  return {
    eyebrow: filled(custom.eyebrow) || defaults.eyebrow,
    title: filled(custom.title) || defaults.title,
    accent: filled(custom.accent) || defaults.accent,
    intro: filled(custom.intro) || defaults.intro,
    image: filled(custom.image) || defaults.image,
  };
}
