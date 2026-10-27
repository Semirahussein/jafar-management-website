import Link from "next/link";
import { notFound } from "next/navigation";
import { getHomeMessages, hasHomeLocale } from "./lib/home-messages";
import "./home.css";

export const metadata = {
  title: "JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER",
  description: "Empowering minds through Islamic education and Quranic teachings.",
  keywords:
    "Islamic education, Quranic studies, JAFARU TOYAR, faith, knowledge, character development",
  author: "JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER",
};

const featureIcons = ["📖", "👨‍🏫", "🏫"];
const programIcons = ["📖", "📖", "📖", "📚", "📚"];
const quickLinkHrefs = ["/", "/about", "/programs", "/admissions"];
const socialHrefs = [
  "https://www.facebook.com/jafarutoyar",
  "https://twitter.com/jafarutoyar",
  "https://www.instagram.com/jafarutoyar",
];

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const requestedLocale = params?.lang;

  if (
    requestedLocale !== undefined &&
    (typeof requestedLocale !== "string" || !hasHomeLocale(requestedLocale))
  ) {
    notFound();
  }

  const locale = requestedLocale ?? "en";
  const home = await getHomeMessages(locale);
  const footer = home.footer;
  const localizedHref = (href) => ({ pathname: href, query: { lang: locale } });

  return (
    <main lang={locale}>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="container hero-content">
          <p className="hero-tag">{home.hero.tag}</p>
          <p className="hero-description">{home.hero.description}</p>

          <div className="hero-buttons">
            <Link href={localizedHref("/about")} className="primary-button">
              {home.hero.learnMore}
            </Link>
            <Link href="/management/login" className="secondary-button">
              {home.hero.login}
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container features-grid">
          {home.features.cards.map((card, index) => (
            <div className="feature-card" key={card.title}>
              <div className="feature-icon">{featureIcons[index]}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-preview section">
        <div className="container about-pgrid">
          <div className="about-image">
            <div className="image-placeholder">
              <span>☪️</span>
            </div>
          </div>
          <div className="about-content">
            <h2 className="section-tag">{home.about.title}</h2>
            <p>{home.about.paragraph1}</p>
            <p>{home.about.paragraph2}</p>
            <Link href={localizedHref("/about")} className="primary-button">
              {home.about.learnMore}
            </Link>
          </div>
        </div>
      </section>

      <section className="programs section">
        <div className="container">
          <div className="section-heading">
            <h2 className="section-tag">{home.programs.title}</h2>
            <p>{home.programs.description}</p>
          </div>

          <div className="programs-grid">
            {home.programs.cards.map((program, index) => (
              <div className="program-card" key={program.name}>
                <div className="program-icon">{programIcons[index]}</div>
                <h3>{program.name}</h3>
                <p>{program.description}</p>
              </div>
            ))}
            <div className="center-button">
              <Link href={localizedHref("/programs")} className="primary-button">
                {home.programs.viewAll}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="why-us section">
        <div className="container">
          <div className="section-heading">
            <h2 className="section-tag">{home.whyUs.title}</h2>
            <p>{home.whyUs.description}</p>
          </div>
          <div className="why-grid">
            {home.whyUs.cards.map((card) => (
              <div className="why-card" key={card.number}>
                <div className="why-number">{card.number}</div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-content">
          <div>
            <p className="section-tag">{home.cta.eyebrow}</p>
            <h2>{home.cta.title}</h2>
            <p>{home.cta.description}</p>
          </div>
          <Link href={localizedHref("/contact")} className="white-button">
            {home.cta.contact}
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-grid">
          <span className="footer-logo">{footer.brand}</span>
          <p>{footer.tagline}</p>
        </div>

        <div className="footer-grid">
          <div>
            <h4>{footer.quickLinks.title}</h4>
            <ul>
              {footer.quickLinks.items.map((label, index) => (
                <li key={quickLinkHrefs[index]}>
                  <Link href={localizedHref(quickLinkHrefs[index])}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>{footer.branches.title}</h4>
            <ul>
              {footer.branches.items.map((branch) => (
                <li key={branch}>{branch}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4>{footer.contact.title}</h4>
            <ul>
              {footer.contact.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="footer-social">
            <h4>{footer.social.title}</h4>
            <ul>
              {footer.social.items.map((label, index) => (
                <li key={socialHrefs[index]}>
                  <Link href={socialHrefs[index]} target="_blank">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="copyright">
          <p>
            {footer.copyright.replace(
              "{year}",
              String(new Date().getFullYear())
            )}
          </p>
        </div>
      </footer>
    </main>
  );
}
