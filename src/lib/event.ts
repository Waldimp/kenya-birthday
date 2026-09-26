export const event = {
  honoree: "Kenya",
  age: 22,
  title: "Kenya’s 22 Birthday",
  dateLabel: "4 de octubre del 2026",
  dateShort: "04.10.26",
  weekday: "Domingo",
  time: "3:00 pm",
  venue: "Mi champa",
  address: "San Salvador",
  mapsUrl: "https://maps.app.goo.gl/pALbK9yiASgPmJgF8",
  song: "La Feria de Cepillín",
  artist: "Cepillín",
  youtubeId: "_yNRCjMpTNg",
  /** Carta principal (Canva) */
  letterHeadline: "VENÍ A MI CUMPLE",
  letterSubline: "celebremos otro año de mi vida!!!",
  /** Texto dentro del sobre cerrado */
  envelopeHeadline: "TE INVITO",
  envelopeSubline: "a mi fiesta",
  /** Video cara (colocar archivo en public/videos/kenya-face.mp4) */
  faceVideoSrc: "/videos/kenya-face.mp4",
  faceVideoPoster: "/photos/kenya-04.png",
  peekPolaroidRight: { src: "/photos/kenya-02.png", alt: "Kenya de niña" },
  dress: {
    title: "Dress Code",
    body: "Fiesta infantil viejita.",
    note: "¡Ve cómod@ y disfruta la fiesta!",
    swatches: ["#FEF7C5", "#FFB4DA", "#D5FFC9", "#F5D1EF", "#BCD3F9", "#FFCCBB"],
  },
  rsvp: {
    raffleNote: "Solo por llegar ya participás en la rifa de gatites.",
  },
  photos: {
    hero: [
      { src: "/photos/kenya-04.png", alt: "Kenya", rotate: "-8deg" },
      { src: "/photos/kenya-02.png", alt: "Kenya de niña", rotate: "3deg", tall: true },
      { src: "/photos/kenya-10.png", alt: "Kenya", rotate: "8deg" },
    ],
    extra: [
      { src: "/photos/kenya-05.png", alt: "Kenya bebé" },
      { src: "/photos/kenya-07.png", alt: "Kenya en la fiesta" },
      { src: "/photos/kenya-01.png", alt: "Kenya" },
      { src: "/photos/kenya-06.png", alt: "Kenya" },
      { src: "/photos/kenya-08.png", alt: "Los gatos de Kenya" },
      { src: "/photos/kenya-03.png", alt: "Kenya de niña" },
    ],
  },
} as const;
