import type { MetadataRoute } from "next";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { TOPICS } from "@/lib/seo/topics";

const siteUrl = "https://classendo.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPaths = ["/", "/flashcards", "/games", "/worksheets", "/printables", "/lessons", "/teacher/community", "/creator", "/faq", "/upgrade", "/legal", "/topics", "/free-resources/animals-vocabulary-beginner-esl"];
  return [
    ...publicPaths.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "/" ? 1 : 0.7 })),
    ...LEGAL_DOCUMENTS.map((document) => ({ url: `${siteUrl}/legal/${document.slug}`, changeFrequency: "yearly" as const, priority: 0.3 })),
    ...TOPICS.map((topic) => ({ url: `${siteUrl}/topics/${topic.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
