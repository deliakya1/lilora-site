// Shared promotional copy is website content; app availability stays in locales.
export const promotionCopy = {
  tr: {
    recordTitle: "Bitki bakımı için ortak bir kayıt",
    recordBody:
      "Kontrolleri, sulamaları ve notları özel evinde bir arada tut. Her bitkiyle kimin, ne zaman ilgilendiğini gör.",
    guidesTitle: "Son bakım rehberleri",
    plantsTitle: "Bitkileri yakından tanı",
  },
  en: {
    recordTitle: "One shared record of plant care",
    recordBody:
      "Keep checks, watering and notes together in a private household. See who cared for each plant and when.",
    guidesTitle: "Latest care guides",
    plantsTitle: "Get to know your plants",
  },
  es: {
    recordTitle: "Un registro compartido de cuidados",
    recordBody:
      "Guarda revisiones, riegos y notas en un hogar privado. Consulta quién cuidó cada planta y cuándo.",
    guidesTitle: "Últimas guías de cuidados",
    plantsTitle: "Conoce mejor tus plantas",
  },
  de: {
    recordTitle: "Ein gemeinsames Pflegeprotokoll",
    recordBody:
      "Halte Kontrollen, Gießen und Notizen in einem privaten Haushalt fest. Sieh nach, wer sich wann um eine Pflanze gekümmert hat.",
    guidesTitle: "Neue Pflegeratgeber",
    plantsTitle: "Lerne deine Pflanzen kennen",
  },
  pt: {
    recordTitle: "Um registro compartilhado de cuidados",
    recordBody:
      "Reúna verificações, regas e notas em um grupo privado da casa. Veja quem cuidou de cada planta e quando.",
    guidesTitle: "Guias de cuidados mais recentes",
    plantsTitle: "Conheça melhor suas plantas",
  },
  fr: {
    recordTitle: "Un historique de soins partagé",
    recordBody:
      "Rassemblez vérifications, arrosages et notes dans un foyer privé. Retrouvez qui a pris soin de chaque plante et quand.",
    guidesTitle: "Les derniers guides de soins",
    plantsTitle: "Mieux connaître vos plantes",
  },
};

export const defaultShareImagePath = (lang) =>
  `/assets/brand/share/${lang}-default.png`;

export function shareImagePath(path, lang) {
  if (!path) return defaultShareImagePath(lang);
  const segments = path.split("/").filter(Boolean);
  if (lang !== "tr" && segments[0] === lang) segments.shift();
  const route = segments.join("--").replace(/\.html$/, "") || "home";
  return `/assets/brand/share/${lang}-${route}.png`;
}
