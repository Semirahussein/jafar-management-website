import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMessages, hasPublicLocale } from "../lib/public-messages";
import "./programs.css";

export const metadata = {
  title: "Our Programs | Jafar Madrasa",
  description:
    "Explore the Quranic and Islamic education programs offered at Jafar Madrasa.",
};

export default async function ProgramsPage({ searchParams }) {
  const params = await searchParams;
  const requestedLocale = params?.lang;

  if (
    requestedLocale !== undefined &&
    (typeof requestedLocale !== "string" || !hasPublicLocale(requestedLocale))
  ) {
    notFound();
  }

  const locale = requestedLocale ?? "en";
  const messages = await getPublicMessages(locale, "programs");
  const contactHref = { pathname: "/contact", query: { lang: locale } };
  const admissionsHref = { pathname: "/admissions", query: { lang: locale } };

  return (
    <main className="programs-page" lang={locale}>
      <section className="programs-hero">
        <div className="programs-hero-content">
          <span className="programs-label">{messages.hero.label}</span>
          <h1>
            {messages.hero.titleStart}
            <span>{messages.hero.titleEnd}</span>
          </h1>
          <p>{messages.hero.description}</p>
        </div>
      </section>

      <section className="programs-intro">
        <span className="section-label">{messages.intro.label}</span>
        <h2>{messages.intro.title}</h2>
        <p>{messages.intro.description}</p>
      </section>

      <section className="main-programs">
        {messages.cards.map((card, index) => (
          <div
            className={`program-card${index === 0 ? " featured-program" : ""}`}
            key={card.title}
          >
            <div className="program-icon">
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="program-content">
              <span className="program-type">{card.type}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <ul>
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>

      <section className="learning-section">
        <div className="learning-heading">
          <span className="section-label">{messages.learning.label}</span>
          <h2>{messages.learning.title}</h2>
          <p>{messages.learning.description}</p>
        </div>
        <div className="learning-steps">
          {messages.learning.steps.map((step, index) => (
            <div className="learning-step" key={step.title}>
              <div className="step-number">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="parent-section">
        <div className="parent-content">
          <span className="section-label">{messages.parents.label}</span>
          <h2>{messages.parents.title}</h2>
          <p>{messages.parents.description}</p>
          <Link href={contactHref} className="program-button">
            {messages.parents.contact}
          </Link>
        </div>
      </section>

      <section className="programs-cta">
        <div>
          <span className="section-label">{messages.cta.label}</span>
          <h2>{messages.cta.title}</h2>
          <p>{messages.cta.description}</p>
          <Link href={admissionsHref} className="program-button">
            {messages.cta.apply}
          </Link>
        </div>
      </section>
    </main>
  );
}
