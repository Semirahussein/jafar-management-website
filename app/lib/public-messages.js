import "server-only";

const publicDictionaries = {
  en: {
    about: () => import("../messages/en/about.json").then((module) => module.default),
    programs: () => import("../messages/en/programs.json").then((module) => module.default),
    contact: () => import("../messages/en/contact.json").then((module) => module.default),
    gallery: () => import("../messages/en/gallery.json").then((module) => module.default),
  },
  am: {
    about: () => import("../messages/am/about.json").then((module) => module.default),
    programs: () => import("../messages/am/programs.json").then((module) => module.default),
    contact: () => import("../messages/am/contact.json").then((module) => module.default),
    gallery: () => import("../messages/am/gallery.json").then((module) => module.default),
  },
};

export function hasPublicLocale(locale) {
  return Object.hasOwn(publicDictionaries, locale);
}

export async function getPublicMessages(locale, page) {
  if (!hasPublicLocale(locale)) {
    throw new RangeError(`Unsupported public page locale: ${locale}`);
  }

  const loadMessages = publicDictionaries[locale][page];
  if (!loadMessages) {
    throw new RangeError(`Unsupported public page dictionary: ${page}`);
  }

  return loadMessages();
}
