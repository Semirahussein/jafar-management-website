import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMessages, hasPublicLocale } from "../lib/public-messages";
import ContactForm from "./contactForm";
import "./contact.css";

export const metadata = {
  title: "Contact Us | Jafar Madrasa",
  description:
    "Get in touch with Jafar Madrasa for admissions, programs, branch information, and general inquiries.",
};

export default async function ContactPage({ searchParams }) {
  const params = await searchParams;
  const requestedLocale = params?.lang;

  if (
    requestedLocale !== undefined &&
    (typeof requestedLocale !== "string" || !hasPublicLocale(requestedLocale))
  ) {
    notFound();
  }

  const locale = requestedLocale ?? "en";
  const messages = await getPublicMessages(locale, "contact");
  const localizedHref = (href) => ({ pathname: href, query: { lang: locale } });

  return (
    <main className="contact-page" lang={locale}>
      <section className="contact-hero">
        <div className="contact-hero-content">
          <span className="contact-label">{messages.hero.label}</span>
          <h1>{messages.hero.title}</h1>
          <p>{messages.hero.description}</p>
        </div>
      </section>

      <section className="contact-intro">
        <span className="section-label">{messages.intro.label}</span>
        <h2>{messages.intro.title}</h2>
        <p>{messages.intro.description}</p>
      </section>

      <section className="contact-main">
        <div className="contact-info">
          <span className="section-label">{messages.information.label}</span>
          <h2>{messages.information.title}</h2>
          <p className="contact-info-intro">
            {messages.information.description}
          </p>

          {[
            {
              icon: "☎",
              title: messages.information.phone,
              values: messages.information.phones,
            },
            {
              icon: "✉",
              title: messages.information.email,
              values: messages.information.emails,
            },
            {
              icon: "📍",
              title: messages.information.address,
              values: messages.information.addresses,
            },
            {
              icon: "◷",
              title: messages.information.hours,
              values: [messages.information.days, messages.information.time],
            },
          ].map((item) => (
            <div className="contact-item" key={item.title}>
              <div className="contact-icon">{item.icon}</div>
              <div>
                <h3>{item.title}</h3>
                {item.values.map((value) => (
                  <p key={value}>{value}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="contact-form-wrapper">
          <span className="section-label">{messages.formIntro.label}</span>
          <h2>{messages.formIntro.title}</h2>
          <p>{messages.formIntro.description}</p>
          <ContactForm messages={messages.form} />
        </div>
      </section>

      <section className="branches-section">
        <div className="branches-heading">
          <span className="section-label">{messages.branches.label}</span>
          <h2>{messages.branches.title}</h2>
          <p>{messages.branches.description}</p>
        </div>
        <div className="branches-grid">
          {messages.branches.items.map((branch, index) => (
            <div className="branch-card" key={branch.name}>
              <span className="branch-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{branch.name}</h3>
              <p>{branch.location}</p>
              <Link href={localizedHref("/contact")}>{branch.action}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="map-section">
        <div className="map-placeholder">
          <div className="map-content">
            <div className="map-pin">⌖</div>
            <h3>{messages.map.title}</h3>
            <p>{messages.map.description}</p>
          </div>
        </div>
      </section>

      <section className="contact-cta">
        <div className="contact-cta-content">
          <span className="section-label">{messages.cta.label}</span>
          <h2>{messages.cta.title}</h2>
          <p>{messages.cta.description}</p>
          <Link href={localizedHref("/admissions")} className="contact-button">
            {messages.cta.apply}
          </Link>
        </div>
      </section>
    </main>
  );
}
