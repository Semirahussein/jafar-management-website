import "server-only";

const homeDictionaries = {
  en: () => import("../messages/en/home.json").then((module) => module.default),
  am: () => import("../messages/am/home.json").then((module) => module.default),
};

export function hasHomeLocale(locale) {
  return Object.hasOwn(homeDictionaries, locale);
}

export async function getHomeMessages(locale) {
  if (!hasHomeLocale(locale)) {
    throw new RangeError(`Unsupported home page locale: ${locale}`);
  }

  return homeDictionaries[locale]();
}
