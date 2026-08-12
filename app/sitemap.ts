import type { MetadataRoute } from "next";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { TOPICS } from "@/lib/seo/topics";

const siteUrl = "https://classendo.com";

const FREE_RESOURCE_SLUGS = [
  "after-school-verbs-beginner-esl",
  "animals-vocabulary-beginner-esl",
  "body-parts-vocabulary-beginner-esl",
  "classroom-actions-verbs-beginner-esl",
  "classroom-objects-vocabulary-beginner-esl",
  "clothing-vocabulary-beginner-esl",
  "family-vocabulary-beginner-esl",
  "five-senses-verbs-beginner-esl",
  "food-actions-verbs-beginner-esl",
  "food-vocabulary-beginner-esl",
  "home-chores-verbs-beginner-esl",
  "home-furniture-vocabulary-beginner-esl",
  "jobs-vocabulary-beginner-esl",
  "kitchen-objects-vocabulary-beginner-esl",
  "morning-routine-verbs-beginner-esl",
  "nature-vocabulary-beginner-esl",
  "numbers-vocabulary-beginner-esl",
  "places-in-town-vocabulary-beginner-esl",
  "school-subjects-vocabulary-beginner-esl",
  "speaking-skills-verbs-beginner-esl",
  "sports-vocabulary-beginner-esl",
  "thinking-verbs-beginner-esl",
  "time-vocabulary-beginner-esl",
  "toys-vocabulary-beginner-esl",
  "transportation-vocabulary-beginner-esl",
  "travel-actions-verbs-beginner-esl",
  "active-verbs-beginner-esl",
  "creative-activities-verbs-beginner-esl",
  "outdoor-adventures-verbs-beginner-esl",
  "weather-vocabulary-beginner-esl",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPaths = ["/", "/flashcards", "/games", "/worksheets", "/printables", "/lessons", "/teacher/community", "/creator", "/faq", "/upgrade", "/legal", "/topics", "/free-resources/animals-vocabulary-beginner-esl"];
  return [
    ...publicPaths.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "/" ? 1 : 0.7 })),
    ...LEGAL_DOCUMENTS.map((document) => ({ url: `${siteUrl}/legal/${document.slug}`, changeFrequency: "yearly" as const, priority: 0.3 })),
    ...TOPICS.map((topic) => ({ url: `${siteUrl}/topics/${topic.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...FREE_RESOURCE_SLUGS.map((slug) => ({ url: `${siteUrl}/free-resources/${slug}`, changeFrequency: "monthly" as const, priority: 0.9 })),
  ];
}
