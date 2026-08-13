import type { Metadata } from "next";
import FreeLessonPackDirectory from "@/components/free-resources/FreeLessonPackDirectory";

export const metadata: Metadata = { title: "Free Beginner ESL Lesson Packs", description: "Browse free printable beginner ESL lesson packs for nouns, verbs, adjectives and prepositions.", alternates: { canonical: "/free-resources" } };

export default function FreeResourcesPage() { return <FreeLessonPackDirectory />; }
