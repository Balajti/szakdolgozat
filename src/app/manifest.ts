import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WordNest – Learn English Through Stories",
    short_name: "WordNest",
    description:
      "Játékos, történetalapú angoltanulás magyar diákoknak: AI-történetek, szókincs és feladatok.",
    start_url: "/",
    display: "standalone",
    background_color: "#e9e3df",
    theme_color: "#ff7a30",
    lang: "hu",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
