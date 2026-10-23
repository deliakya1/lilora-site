// Three-question plant finder over the existing plant library. Runs in the browser
// with the page's own data: no account, no AI call, nothing stored or sent.
// Light fit comes from each plant's meta.json "finderLight"; care and pet lines
// reuse the profile's localized at-a-glance summary, so the finder never adds claims.
import { escape, json, prefix, plantPath, articlePath } from "./layout.mjs";

export const finderPath = (l) => `${prefix(l)}plants/finder/`;

export const finderCopy = {
  tr: {
    title: "Sana uygun bitki hangisi?",
    description: "Işık, deneyim ve evcil hayvanlarla ilgili üç soruyu cevapla; Lilora kütüphanesinden iki üç bitkiyi, neden önerildiğini ve bakım rehberlerini gör.",
    intro: "Üç soru, Lilora kütüphanesindeki 12 bitkiyle eşleştirilir. Cevapların hiçbir yere gönderilmez ve kaydedilmez; yalnızca tarayıcında kalır.",
    light: ["Bitkiyi koyacağın yer ne kadar ışık alıyor?", { low: "Az ışık: pencereden uzak ya da loş bir oda", medium: "Aydınlık ama bitkiye doğrudan güneş gelmiyor", bright: "Günde birkaç saat doğrudan güneş" }],
    level: ["Bitki bakımında ne kadar deneyimlisin?", { new: "Yeni başlıyorum", some: "Daha önce bitki yaşattım" }],
    pets: ["Kedi veya köpek için toksisite bilgisini özellikle dikkate alalım mı?", { yes: "Evet, yalnızca ASPCA'nın kedi ve köpekler için toksik değil olarak listelediği bitkileri göster", no: "Hayır, tüm bitkileri toksisite notlarıyla göster" }],
    submit: "Bitkileri göster",
    results: "Göz atabileceğin bitkiler",
    why: { light: "Işık", care: "Bakım", pets: "Kedi ve köpek" },
    guide: "Bakım rehberini oku",
    harder: "Buradaki çoğu bitkiden daha fazla ilgi ister.",
    noMatch: "Kütüphanemizdeki 12 bitkiden hiçbiri hem ASPCA listesinde toksik değil olarak geçiyor hem de bu ışığa uyuyor. Aşağıdakiler o listede yer alıyor ama farklı bir yer istiyor; almadan önce ışık satırını oku.",
    limitsTitle: "Seçmeden önce",
    limits: [
      "Bu sonuç 12 bitki profilimize dayanan bir başlangıç noktasıdır; bitkinin evinde iyi büyüyeceğinin garantisi değildir. Sıcaklık, sulama ve tam konum da önemlidir.",
      "Toksisite bilgisi, her profilde özetlendiği gibi <a href=\"https://www.aspca.org/\">ASPCA Animal Poison Control Center</a>'ın kedi ve köpek listesine dayanır. Yalnızca kedi ve köpekleri kapsar, liste bir güvenlik garantisi değildir ve toksik değil, hayvanın bitkiyi yiyebileceği anlamına gelmez.",
      "Evcil hayvanın bir bitkiyi kemirdiyse veya iyi görünmüyorsa veterinerine başvur.",
      "Kütüphanede şimdilik yalnızca 12 bitki var; birçok iyi seçenek henüz burada değil.",
    ],
    noJs: "Bu araç JavaScript ile çalışır. JavaScript kapalıysa bitki kütüphanesinin filtrelerini kullan:",
    guides: "İlgili rehberler",
    hubLink: "Nereden başlayacağını bilmiyor musun? <a href=\"{href}\">Üç soruluk bitki seçiciyi dene</a>.",
  },
  en: {
    title: "Which houseplant suits you?",
    description: "Answer three questions about light, experience and pets to see two or three plants from the Lilora library, why they fit and their care guides.",
    intro: "Three questions, matched against the 12 plants in the Lilora library. Nothing is stored or sent; your answers stay in your browser.",
    light: ["How much light does the spot get?", { low: "Little light: far from a window or in a dim room", medium: "Bright, but no direct sun on the plant", bright: "Direct sun for several hours a day" }],
    level: ["How much plant-care experience do you have?", { new: "I’m just starting", some: "I’ve kept plants alive before" }],
    pets: ["Should we take cat and dog toxicity into account?", { yes: "Yes, show only plants the ASPCA lists as non-toxic to cats and dogs", no: "No, show all plants with their toxicity notes" }],
    submit: "Show plants",
    results: "Plants to consider",
    why: { light: "Light", care: "Care", pets: "Cats and dogs" },
    guide: "Read the care guide",
    harder: "Needs more attention than most plants here.",
    noMatch: "None of the 12 plants in our library is both listed non-toxic by the ASPCA and suited to this light. The plants below are on that list but want a different spot; read the light line before you buy.",
    limitsTitle: "Before you choose",
    limits: [
      "This is a starting point drawn from our 12 plant profiles, not a guarantee that a plant will thrive in your home. Temperature, watering and the exact spot matter too.",
      "Toxicity information comes from the <a href=\"https://www.aspca.org/\">ASPCA Animal Poison Control Center</a> list for cats and dogs, as summarised on each profile. It covers only cats and dogs, the list is not a safety guarantee, and non-toxic does not mean a pet can eat the plant.",
      "If a pet chews a plant or seems unwell, contact your vet.",
      "The library has only 12 plants so far, so many good options are not here yet.",
    ],
    noJs: "This tool needs JavaScript. Without it, use the plant library filters:",
    guides: "Related guides",
    hubLink: "Not sure where to start? <a href=\"{href}\">Try the three-question plant finder</a>.",
  },
  es: {
    title: "¿Qué planta de interior te conviene?",
    description: "Responde tres preguntas sobre luz, experiencia y mascotas y verás dos o tres plantas de la biblioteca de Lilora, por qué encajan y sus guías de cuidado.",
    intro: "Tres preguntas que se cruzan con las 12 plantas de la biblioteca de Lilora. No se guarda ni se envía nada; tus respuestas se quedan en tu navegador.",
    light: ["¿Cuánta luz recibe el lugar?", { low: "Poca luz: lejos de una ventana o en una habitación oscura", medium: "Luminoso, pero sin sol directo sobre la planta", bright: "Sol directo varias horas al día" }],
    level: ["¿Cuánta experiencia tienes cuidando plantas?", { new: "Estoy empezando", some: "Ya he mantenido plantas con vida" }],
    pets: ["¿Tenemos en cuenta la toxicidad para gatos y perros?", { yes: "Sí, muestra solo plantas que la ASPCA incluye como no tóxicas para gatos y perros", no: "No, muestra todas las plantas con sus notas de toxicidad" }],
    submit: "Ver plantas",
    results: "Plantas para considerar",
    why: { light: "Luz", care: "Cuidados", pets: "Gatos y perros" },
    guide: "Leer la guía de cuidados",
    harder: "Pide más atención que la mayoría de las plantas de esta lista.",
    noMatch: "Ninguna de las 12 plantas de nuestra biblioteca figura como no tóxica en la lista de la ASPCA y a la vez se adapta a esta luz. Las siguientes están en esa lista, pero necesitan otro lugar; lee la línea de luz antes de comprar.",
    limitsTitle: "Antes de elegir",
    limits: [
      "Es un punto de partida basado en nuestras 12 fichas de plantas, no una garantía de que la planta prospere en tu casa. La temperatura, el riego y el lugar exacto también cuentan.",
      "La información de toxicidad procede de la lista de gatos y perros del <a href=\"https://www.aspca.org/\">ASPCA Animal Poison Control Center</a>, tal como se resume en cada ficha. Solo cubre gatos y perros, la lista no es una garantía de seguridad y no tóxica no significa que un animal pueda comérsela.",
      "Si tu mascota mordisquea una planta o no se encuentra bien, contacta con tu veterinario.",
      "La biblioteca tiene por ahora solo 12 plantas, así que muchas buenas opciones aún no están aquí.",
    ],
    noJs: "Esta herramienta necesita JavaScript. Sin él, usa los filtros de la biblioteca de plantas:",
    guides: "Guías relacionadas",
    hubLink: "¿No sabes por dónde empezar? <a href=\"{href}\">Prueba el selector de plantas de tres preguntas</a>.",
  },
  de: {
    title: "Welche Zimmerpflanze passt zu dir?",
    description: "Beantworte drei Fragen zu Licht, Erfahrung und Haustieren und sieh zwei oder drei Pflanzen aus der Lilora-Bibliothek mit Begründung und Pflegeratgeber.",
    intro: "Drei Fragen, abgeglichen mit den 12 Pflanzen der Lilora-Bibliothek. Nichts wird gespeichert oder gesendet; deine Antworten bleiben in deinem Browser.",
    light: ["Wie viel Licht bekommt der Platz?", { low: "Wenig Licht: weit weg vom Fenster oder in einem dunklen Raum", medium: "Hell, aber ohne direkte Sonne auf der Pflanze", bright: "Mehrere Stunden direkte Sonne am Tag" }],
    level: ["Wie viel Erfahrung hast du mit Pflanzenpflege?", { new: "Ich fange gerade an", some: "Ich habe schon Pflanzen am Leben gehalten" }],
    pets: ["Sollen wir die Giftigkeit für Katzen und Hunde berücksichtigen?", { yes: "Ja, nur Pflanzen zeigen, die die ASPCA als ungiftig für Katzen und Hunde führt", no: "Nein, alle Pflanzen mit ihren Hinweisen zur Giftigkeit zeigen" }],
    submit: "Pflanzen zeigen",
    results: "Pflanzen zur Auswahl",
    why: { light: "Licht", care: "Pflege", pets: "Katzen und Hunde" },
    guide: "Pflegeratgeber lesen",
    harder: "Braucht mehr Aufmerksamkeit als die meisten Pflanzen hier.",
    noMatch: "Keine der 12 Pflanzen unserer Bibliothek steht als ungiftig auf der ASPCA-Liste und passt zugleich zu diesem Licht. Die folgenden stehen auf der Liste, brauchen aber einen anderen Platz; lies vor dem Kauf die Zeile zum Licht.",
    limitsTitle: "Bevor du dich entscheidest",
    limits: [
      "Das ist ein Ausgangspunkt auf Basis unserer 12 Pflanzenprofile, keine Garantie, dass die Pflanze bei dir gedeiht. Temperatur, Gießen und der genaue Platz zählen ebenfalls.",
      "Die Angaben zur Giftigkeit stammen aus der Katzen- und Hundeliste des <a href=\"https://www.aspca.org/\">ASPCA Animal Poison Control Center</a>, wie sie in jedem Profil zusammengefasst ist. Sie gelten nur für Katzen und Hunde, die Liste ist keine Sicherheitsgarantie, und ungiftig heißt nicht, dass ein Tier die Pflanze fressen darf.",
      "Wenn dein Haustier an einer Pflanze knabbert oder krank wirkt, wende dich an deine Tierarztpraxis.",
      "Die Bibliothek umfasst erst 12 Pflanzen; viele gute Optionen fehlen noch.",
    ],
    noJs: "Dieses Werkzeug braucht JavaScript. Ohne JavaScript nutze die Filter der Pflanzenbibliothek:",
    guides: "Passende Ratgeber",
    hubLink: "Unsicher, wo du anfangen sollst? <a href=\"{href}\">Probiere die Pflanzenauswahl mit drei Fragen</a>.",
  },
  pt: {
    title: "Qual planta combina com você?",
    description: "Responda três perguntas sobre luz, experiência e pets e veja duas ou três plantas da biblioteca do Lilora, por que combinam e seus guias de cuidado.",
    intro: "Três perguntas, cruzadas com as 12 plantas da biblioteca do Lilora. Nada é salvo nem enviado; suas respostas ficam no seu navegador.",
    light: ["Quanta luz o lugar recebe?", { low: "Pouca luz: longe da janela ou em um cômodo escuro", medium: "Claro, mas sem sol direto na planta", bright: "Sol direto por várias horas ao dia" }],
    level: ["Quanta experiência você tem com plantas?", { new: "Estou começando", some: "Já mantive plantas vivas antes" }],
    pets: ["Devemos considerar a toxicidade para gatos e cães?", { yes: "Sim, mostrar só plantas que a ASPCA lista como não tóxicas para gatos e cães", no: "Não, mostrar todas as plantas com as notas de toxicidade" }],
    submit: "Ver plantas",
    results: "Plantas para considerar",
    why: { light: "Luz", care: "Cuidados", pets: "Gatos e cães" },
    guide: "Ler o guia de cuidados",
    harder: "Pede mais atenção que a maioria das plantas desta lista.",
    noMatch: "Nenhuma das 12 plantas da nossa biblioteca aparece como não tóxica na lista da ASPCA e, ao mesmo tempo, combina com essa luz. As plantas abaixo estão nessa lista, mas precisam de outro lugar; leia a linha de luz antes de comprar.",
    limitsTitle: "Antes de escolher",
    limits: [
      "Este é um ponto de partida baseado nos nossos 12 perfis de plantas, não uma garantia de que a planta vai se dar bem na sua casa. Temperatura, rega e o lugar exato também importam.",
      "As informações de toxicidade vêm da lista de gatos e cães do <a href=\"https://www.aspca.org/\">ASPCA Animal Poison Control Center</a>, conforme resumido em cada perfil. Cobrem só gatos e cães, a lista não é garantia de segurança e não tóxica não significa que o animal possa comer a planta.",
      "Se o seu pet mastigar uma planta ou parecer mal, procure o veterinário.",
      "Por enquanto a biblioteca tem só 12 plantas, então muitas boas opções ainda não estão aqui.",
    ],
    noJs: "Esta ferramenta precisa de JavaScript. Sem ele, use os filtros da biblioteca de plantas:",
    guides: "Guias relacionados",
    hubLink: "Não sabe por onde começar? <a href=\"{href}\">Experimente o seletor de plantas com três perguntas</a>.",
  },
  fr: {
    title: "Quelle plante d’intérieur vous convient ?",
    description: "Répondez à trois questions sur la lumière, l’expérience et les animaux pour voir deux ou trois plantes de la bibliothèque Lilora et leurs fiches.",
    intro: "Trois questions, croisées avec les 12 plantes de la bibliothèque Lilora. Rien n’est enregistré ni envoyé ; vos réponses restent dans votre navigateur.",
    light: ["Quelle lumière reçoit l’emplacement ?", { low: "Peu de lumière : loin d’une fenêtre ou dans une pièce sombre", medium: "Lumineux, mais sans soleil direct sur la plante", bright: "Plusieurs heures de soleil direct par jour" }],
    level: ["Quelle est votre expérience avec les plantes ?", { new: "Je débute", some: "J’ai déjà gardé des plantes en bonne santé" }],
    pets: ["Faut-il tenir compte de la toxicité pour les chats et les chiens ?", { yes: "Oui, seulement les plantes que l’ASPCA classe non toxiques pour les chats et les chiens", no: "Non, toutes les plantes avec leurs notes de toxicité" }],
    submit: "Voir les plantes",
    results: "Plantes à envisager",
    why: { light: "Lumière", care: "Entretien", pets: "Chats et chiens" },
    guide: "Lire la fiche d’entretien",
    harder: "Demande plus d’attention que la plupart des plantes de cette liste.",
    noMatch: "Aucune des 12 plantes de notre bibliothèque n’est à la fois classée non toxique par l’ASPCA et adaptée à cette lumière. Les plantes ci-dessous figurent sur cette liste mais demandent un autre emplacement ; lisez la ligne lumière avant d’acheter.",
    limitsTitle: "Avant de choisir",
    limits: [
      "C’est un point de départ fondé sur nos 12 fiches de plantes, pas une garantie que la plante se plaira chez vous. La température, l’arrosage et l’emplacement exact comptent aussi.",
      "Les informations de toxicité viennent de la liste chats et chiens de l’<a href=\"https://www.aspca.org/\">ASPCA Animal Poison Control Center</a>, telle que résumée sur chaque fiche. Elles ne concernent que les chats et les chiens, la liste n’est pas une garantie de sécurité et non toxique ne veut pas dire qu’un animal peut la manger.",
      "Si votre animal mâchonne une plante ou semble mal, contactez votre vétérinaire.",
      "La bibliothèque ne compte pour l’instant que 12 plantes ; beaucoup de bonnes options n’y sont pas encore.",
    ],
    noJs: "Cet outil a besoin de JavaScript. Sans lui, utilisez les filtres de la bibliothèque de plantes :",
    guides: "Guides associés",
    hubLink: "Vous ne savez pas par où commencer ? <a href=\"{href}\">Essayez le sélecteur de plantes en trois questions</a>.",
  },
};

// Link for the plant hub, above the filter chips.
export const finderHubLink = (l) =>
  finderCopy[l] ? `<p class="finder-hub-link">${finderCopy[l].hubLink.replace("{href}", finderPath(l))}</p>` : "";

export const plantFinder = (l, plants, articles, filters) => {
  const t = finderCopy[l];
  const own = plants.filter((p) => p[l] && (p.finderLight || []).length);
  const data = own.map((p) => ({
    title: p[l].title,
    botanical: p.botanicalName,
    path: plantPath(p, l),
    image: p.image,
    width: p.imageWidth,
    height: p.imageHeight,
    alt: p[l].imageAlt || "",
    light: p.finderLight,
    tags: p.tags || [],
    glance: { light: p[l].atAGlance.light, care: p[l].atAGlance.careLevel, pets: p[l].atAGlance.petSafety, source: p[l].atAGlance.petSafetySource },
  }));
  const question = (name, [legend, options]) =>
    `<fieldset class="finder-question"><legend>${escape(legend)}</legend>${Object.entries(options).map(([value, label]) => `<label><input type="radio" name="${name}" value="${value}" required> <span>${escape(label)}</span></label>`).join("")}</fieldset>`;
  const hub = `${prefix(l)}plants/`;
  const filterLinks = ["lowLight", "beginner", "petNonToxic"]
    .filter((id) => filters?.chips?.[id])
    .map((id) => `<li><a href="${hub}#${id}">${escape(filters.chips[id])}</a></li>`)
    .join("");
  const guides = ["indoor-plant-light-guide", "pet-safe-houseplants", "check-before-you-water"]
    .map((slug) => articles.find((a) => a.slug === slug && a[l]))
    .filter(Boolean)
    .map((a) => `<li><a href="${articlePath(a, l)}">${escape(a[l].title)}</a></li>`)
    .join("");
  return `<section class="plant-finder" data-plant-finder><link rel="stylesheet" href="/assets/plant-finder.css"><p class="finder-intro">${escape(t.intro)}</p><div class="finder-fallback" data-finder-fallback><p>${escape(t.noJs)}</p><ul>${filterLinks}</ul></div><form class="finder-form" data-finder-form hidden>${question("light", t.light)}${question("level", t.level)}${question("pets", t.pets)}<button type="submit">${escape(t.submit)}</button></form><section class="finder-results" data-finder-results aria-live="polite" hidden><h2 tabindex="-1">${escape(t.results)}</h2><p class="finder-no-match" data-finder-no-match hidden>${escape(t.noMatch)}</p><ol class="finder-list" data-finder-list></ol></section><aside class="finder-limits"><h2>${escape(t.limitsTitle)}</h2><ul>${t.limits.map((x) => `<li>${x}</li>`).join("")}</ul></aside>${guides ? `<section class="topic-links"><h2>${escape(t.guides)}</h2><ul class="plant-filter-links">${guides}</ul></section>` : ""}<script type="application/json" data-finder-data>${json({ plants: data, copy: { why: t.why, guide: t.guide, harder: t.harder } })}</script><script defer src="/assets/plant-finder.js"></script></section>`;
};
