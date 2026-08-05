import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { LEGAL_DOCUMENT_BY_SLUG, LEGAL_DOCUMENTS } from "@/lib/legal/documents";

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const document = LEGAL_DOCUMENT_BY_SLUG.get(slug);
  if (!document) return {};
  return { title: document.title, description: document.summary };
}

export default async function LegalDocumentRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = LEGAL_DOCUMENT_BY_SLUG.get(slug);
  if (!document) notFound();
  return <LegalDocumentPage document={document} />;
}
