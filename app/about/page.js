import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicMessages, hasPublicLocale } from "../lib/public-messages";
import "./about.css";

export const metadata = {
  title: "About Us - JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER",
  description:
    "Nurturing faith, knowledge, character, and a lifelong connection with the Quran.",
  keywords:
    "Islamic education, Quranic studies, JAFARU TOYAR, faith, knowledge, character development",
  author: "JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER",
};

export default async function AboutPage({ searchParams }) {
  const params = await searchParams;
  const requestedLocale = params?.lang;

  if (
    requestedLocale !== undefined &&
    (typeof requestedLocale !== "string" || !hasPublicLocale(requestedLocale))
  ) {
    notFound();
  }

  const locale = requestedLocale ?? "en";
  const messages = await getPublicMessages(locale, "about");
  const contactHref = { pathname: "/contact", query: { lang: locale } };

  return (
    <main className="about-page" lang={locale}>
      <section className="about-hero">
        <div className="about-hero-content">
          <span className="about-label">{messages.hero.label}</span>
          <p>{messages.hero.welcome}</p>
          <p>{messages.hero.intro}</p>
        </div>
      </section>

      <section className="about-intro">
        <div className="about-intro-image">
          <div className="image-placeholder">
            <span>....JAFARU TOYAR....</span>
          </div>
        </div>
        <div className="about-intro-content">
          <span className="section-label">{messages.identity.label}</span>
          <h2>{messages.identity.title}</h2>
          {messages.identity.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {messages.identity.statements.map((statement) => (
            <h2 key={statement}>{statement}</h2>
          ))}
        </div>
      </section>

      <section className="mission-vision">
        <div className="section-heading-center">
          <span className="section-label">{messages.purpose.label}</span>
          <h2>{messages.purpose.title}</h2>
          <p>{messages.purpose.description}</p>
        </div>
        <div className="mission-grid">
          {messages.purpose.cards.map((card, index) => (
            <div className="mission-card" key={card.title}>
              <div className="mission-icon">{index === 0 ? "🌟" : "🎯"}</div>
              <h3>{card.title}</h3>
              {card.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="about-programs">
        <div className="section-heading-center">
          <span className="section-label">{messages.programs.label}</span>
          <h2>{messages.programs.title}</h2>
          <p>{messages.programs.description}</p>
          <p>{messages.programs.journey}</p>
        </div>
        <div className="programs-grid">
          {messages.programs.cards.map((card, index) => (
            <div className="program-card" key={card.title}>
              <span className="program-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{card.title}</h3>
              {card.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="about-cta">
        <div>
          <span className="section-label">{messages.cta.label}</span>
          <h2>{messages.cta.title}</h2>
          <p>{messages.cta.description}</p>
          <Link href={contactHref} className="about-cta-button">
            {messages.cta.contact}
          </Link>
        </div>
      </section>
    </main>
  );
}
