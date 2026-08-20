import { notFound } from "next/navigation";
import TwelveCardLessonPackPage from "@/components/free-resources/TwelveCardLessonPackPage";
import { getTwelveCardLessonPack, PUBLISHED_TWELVE_CARD_LESSON_PACKS } from "@/lib/twelve-card-lesson-packs/catalog";

export function generateStaticParams() {
  return PUBLISHED_TWELVE_CARD_LESSON_PACKS.map((pack) => ({ slug: pack.slug }));
}

export async function generateMetadata({ params }: PageProps<"/free-resources/[slug]">) {
  const { slug } = await params;
  const pack = getTwelveCardLessonPack(slug);
  if (!pack) return {};
  const path = `/free-resources/${pack.slug}`;
  const title = pack.seo?.title ?? `Free ${pack.title} 12 Card Lesson Pack for Beginner ESL`;
  const description = pack.seo?.description ?? `Download a free printable ${pack.title} 12 Card Lesson Pack for beginner ESL with flashcards, four worksheets, lesson plan and movement activity.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", siteName: "Classendo", images: pack.coverImage ? [{ url: pack.coverImage, alt: `${pack.title} 12 Card Lesson Pack` }] : [] },
    twitter: { card: "summary_large_image", title, description, images: pack.coverImage ? [pack.coverImage] : [] },
  };
}

export default async function Page({ params }: PageProps<"/free-resources/[slug]">) {
  const { slug } = await params;
  const pack = getTwelveCardLessonPack(slug);
  if (!pack) notFound();
  return <TwelveCardLessonPackPage pack={pack} />;
}
