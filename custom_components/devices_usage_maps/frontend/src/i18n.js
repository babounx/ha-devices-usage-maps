// Devices Usage Maps — translations.
// The language follows each Home Assistant installation/user profile.
import en from "./translations/en.js";
import fr from "./translations/fr.js";

const LANGUAGES = { en, fr };

function lookup(dict, key) {
  return key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

export function getLanguage(hass) {
  const lang = (hass?.locale?.language || hass?.language || "en").toLowerCase();
  if (LANGUAGES[lang]) return lang;
  const base = lang.split("-")[0];
  return LANGUAGES[base] ? base : "en";
}

/** Returns a translate function bound to the user's language (falls back to English). */
export function translator(hass) {
  const dict = LANGUAGES[getLanguage(hass)];
  return (key, vars = {}) => {
    let s = lookup(dict, key);
    if (s === undefined) s = lookup(en, key);
    if (s === undefined) return key;
    return String(s).replace(/\{(\w+)\}/g, (_, v) => (vars[v] ?? `{${v}}`));
  };
}
