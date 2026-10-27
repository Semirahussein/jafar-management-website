import { notFound } from "next/navigation";
import { getPublicMessages, hasPublicLocale } from "../lib/public-messages";

export default async function GalleryPage({ searchParams }) {
  const params = await searchParams;
  const requestedLocale = params?.lang;

  if (
    requestedLocale !== undefined &&
    (typeof requestedLocale !== "string" || !hasPublicLocale(requestedLocale))
  ) {
    notFound();
  }

  const locale = requestedLocale ?? "en";
  const messages = await getPublicMessages(locale, "gallery");

  return (
    <main className="gallery-page" lang={locale}>
      <section className="gallery-placeholder">
        <h1>{messages.title}</h1>
        <p>{messages.description}</p>
      </section>
    </main>
  );
}
