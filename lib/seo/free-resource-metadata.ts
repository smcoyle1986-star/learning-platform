import type { Metadata } from "next";

type FreeResourceMetadataInput = {
  slug: string;
  title: string;
};

export function createFreeResourceMetadata({
  slug,
  title,
}: FreeResourceMetadataInput): Metadata {
  const path = `/free-resources/${slug}`;
  const resourceTitle = `Free ${title} Lesson Pack for Beginner ESL`;
  const description = `Download a free printable ${title} lesson pack for beginner ESL with visual flashcards, a worksheet, classroom activity, lesson plan, and an optional free interactive Classroom Mode extension.`;
  const image = `/resources/${slug}/${slug}-full-pack-pinterest.png`;

  return {
    title: resourceTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: resourceTitle,
      description,
      url: path,
      type: "website",
      siteName: "Classendo",
      images: [{ url: image, width: 1000, height: 1500, alt: `${title} beginner ESL printable lesson pack` }],
    },
    twitter: {
      card: "summary_large_image",
      title: resourceTitle,
      description,
      images: [{ url: image, alt: `${title} beginner ESL printable lesson pack` }],
    },
  };
}
