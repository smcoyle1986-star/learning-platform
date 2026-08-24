"use client";

import {
  Check,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import PremiumPreviewOverlay from "@/components/billing/PremiumPreviewOverlay";
import PageHeader from "@/components/navigation/PageHeader";
import { PAGE_CONTENT } from "@/lib/seo/page-content";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import {
  createCreatorCard,
  creatorCardToLessonCard,
  deleteCreatorCard,
  deleteCreatorImage,
  listCreatorCards,
  listCreatorImages,
  updateCreatorCard,
  uploadCreatorImage,
} from "@/lib/creator/client";
import type {
  CreatorCardType,
  CreatorFlashcardDto,
  CreatorImageDto,
} from "@/lib/creator/types";
import { readLessonTray, writeLessonTray } from "@/lib/lessons/tray";

type UploadJob = {
  id: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "error";
  error?: string;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const CARD_TYPE_OPTIONS: Array<{ value: CreatorCardType; label: string }> = [
  { value: "noun", label: "Noun" },
  { value: "verb", label: "Verb" },
  { value: "adjective", label: "Adjective" },
  { value: "preposition", label: "Preposition" },
  { value: "phonics", label: "Phonics" },
];

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function CreatorPage() {
  const { user, loading: authLoading } = useAuth();
  const { access, loading: billingLoading } = useBillingAccess();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlsRef = useRef(new Set<string>());

  const [images, setImages] = useState<CreatorImageDto[]>([]);
  const [cards, setCards] = useState<CreatorFlashcardDto[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftTypes, setDraftTypes] = useState<Record<string, CreatorCardType | "">>({});
  const [cardEdits, setCardEdits] = useState<Record<string, string>>({});
  const [cardTypeEdits, setCardTypeEdits] = useState<Record<string, CreatorCardType>>({});
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
  const [savingCardId, setSavingCardId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isPremium = Boolean(access?.isPremium);
  const busyLoading = authLoading || billingLoading;

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !isPremium) return;
    let active = true;
    setLoadingLibrary(true);
    setError(null);

    Promise.all([listCreatorImages(), listCreatorCards()])
      .then(([nextImages, nextCards]) => {
        if (!active) return;
        setImages(nextImages);
        setCards(nextCards);
        setCardEdits(Object.fromEntries(nextCards.map((card) => [card.id, card.front])));
        setCardTypeEdits(Object.fromEntries(nextCards.map((card) => [card.id, card.cardType])));
      })
      .catch((nextError) => {
        if (active) setError(messageFor(nextError));
      })
      .finally(() => {
        if (active) setLoadingLibrary(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, isPremium]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const cardsByImageId = useMemo(() => {
    const counts = new Map<string, number>();
    cards.forEach((card) => {
      counts.set(card.creatorImageId, (counts.get(card.creatorImageId) ?? 0) + 1);
    });
    return counts;
  }, [cards]);

  function releasePreview(url: string) {
    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(url);
  }

  async function handleFiles(fileList: FileList | File[]) {
    if (!isPremium) return;
    const selected = Array.from(fileList);
    if (selected.length === 0) return;
    setError(null);

    const validFiles: Array<{ file: File; job: UploadJob }> = [];
    const rejected: UploadJob[] = [];

    selected.forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      const id = `${file.name}-${file.lastModified}-${crypto.randomUUID()}`;

      if (!ACCEPTED_TYPES.has(file.type)) {
        rejected.push({
          id,
          name: file.name,
          previewUrl,
          status: "error",
          error: "Use a JPEG, PNG, or WebP image.",
        });
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        rejected.push({
          id,
          name: file.name,
          previewUrl,
          status: "error",
          error: "Image is larger than 10 MB.",
        });
        return;
      }

      validFiles.push({
        file,
        job: { id, name: file.name, previewUrl, status: "uploading" },
      });
    });

    setUploadJobs((current) => [
      ...rejected,
      ...validFiles.map(({ job }) => job),
      ...current,
    ]);

    await Promise.all(
      validFiles.map(async ({ file, job }) => {
        try {
          const uploaded = await uploadCreatorImage(file);
          setImages((current) => [uploaded, ...current]);
          setDrafts((current) => ({ ...current, [uploaded.id]: "" }));
          setDraftTypes((current) => ({ ...current, [uploaded.id]: "" }));
          setUploadJobs((current) => current.filter((item) => item.id !== job.id));
          releasePreview(job.previewUrl);
          setNotice(`${file.name} uploaded.`);
        } catch (nextError) {
          setUploadJobs((current) =>
            current.map((item) =>
              item.id === job.id
                ? { ...item, status: "error", error: messageFor(nextError) }
                : item
            )
          );
        }
      })
    );
  }

  async function saveCardForImage(image: CreatorImageDto) {
    const front = String(drafts[image.id] ?? "").trim();
    const cardType = draftTypes[image.id] ?? "";
    if (!front) {
      setError("Add text before saving the card.");
      return;
    }
    if (!cardType) {
      setError("Choose noun, verb, adjective, preposition, or phonics before saving.");
      return;
    }

    setSavingImageId(image.id);
    setError(null);
    try {
      const card = await createCreatorCard({ creatorImageId: image.id, front, cardType });
      setCards((current) => [card, ...current]);
      setCardEdits((current) => ({ ...current, [card.id]: card.front }));
      setCardTypeEdits((current) => ({ ...current, [card.id]: card.cardType }));
      setDrafts((current) => ({ ...current, [image.id]: "" }));
      setDraftTypes((current) => ({ ...current, [image.id]: "" }));
      setNotice(`“${card.front}” saved to My Uploads.`);
    } catch (nextError) {
      setError(messageFor(nextError));
    } finally {
      setSavingImageId(null);
    }
  }

  async function saveCardEdit(card: CreatorFlashcardDto) {
    const front = String(cardEdits[card.id] ?? "").trim();
    const cardType = cardTypeEdits[card.id] ?? card.cardType;
    setSavingCardId(card.id);
    setError(null);
    try {
      const updated = await updateCreatorCard(card.id, { front, cardType });
      setCards((current) => current.map((item) => (item.id === card.id ? updated : item)));
      setCardEdits((current) => ({ ...current, [card.id]: updated.front }));
      setCardTypeEdits((current) => ({ ...current, [card.id]: updated.cardType }));
      setNotice("Card updated.");
    } catch (nextError) {
      setError(messageFor(nextError));
    } finally {
      setSavingCardId(null);
    }
  }

  async function removeCard(card: CreatorFlashcardDto) {
    if (!window.confirm(`Delete the card “${card.front}”? Saved lesson cards will be kept.`)) return;
    setDeletingId(card.id);
    setError(null);
    try {
      await deleteCreatorCard(card.id);
      setCards((current) => current.filter((item) => item.id !== card.id));
      setNotice("Card deleted.");
    } catch (nextError) {
      setError(messageFor(nextError));
    } finally {
      setDeletingId(null);
    }
  }

  async function removeImage(image: CreatorImageDto) {
    if (!window.confirm(`Delete ${image.originalFilename}? This cannot be undone.`)) return;
    setDeletingId(image.id);
    setError(null);
    try {
      await deleteCreatorImage(image.id);
      setImages((current) => current.filter((item) => item.id !== image.id));
      setNotice("Image deleted.");
    } catch (nextError) {
      setError(messageFor(nextError));
    } finally {
      setDeletingId(null);
    }
  }

  function addCardsToTray(cardsToAdd: CreatorFlashcardDto[]) {
    const current = readLessonTray();
    const existingIds = new Set(current.map((card) => card.id));
    const additions = cardsToAdd
      .map(creatorCardToLessonCard)
      .filter((card) => !existingIds.has(card.id));
    writeLessonTray([...current, ...additions]);
    setNotice(
      additions.length === 0
        ? "Those cards are already in the lesson tray."
        : `${additions.length} ${additions.length === 1 ? "card" : "cards"} added to the lesson tray.`
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <PageHeader
        title="My Uploads"
        description={PAGE_CONTENT.creator.description}
        sticky={false}
        primaryItems={[{ label: "Classroom", href: "/flashcards/classroom" }]}
        secondaryItems={[
          { label: "Flashcards", href: "/flashcards" },
          { label: "My Lessons", href: "/dashboard" },
          { label: "Community", href: "/teacher/community" },
          { label: "Games", href: "/games" },
          { label: "Worksheets", href: "/worksheets" },
          { label: "Lesson Plans", href: "/lessons" },
          { label: "Printables", href: "/printables" },
        ]}
      />

      <main className="relative min-h-[75vh]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {!busyLoading && !user ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-bold">Sign in to use Creator</h2>
              <p className="mt-3 text-sm text-[#6b756b]">Your images and cards are saved securely to your account.</p>
              <Link href="/login" className="btn btn-primary mt-6 inline-flex px-6 py-3">Sign in</Link>
            </div>
          ) : (
            <>
              <section className="rounded-[2rem] border border-[#dce5d7] bg-[linear-gradient(135deg,#f7fbf3,#eef5e8)] p-6 shadow-sm md:p-8">
                <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#718367]">Private image library</div>
                    <h2 className="mt-2 text-3xl font-bold">Turn your own images into classroom cards</h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#687268]">
                      Upload several images at once, add card text, then mix your cards with Classendo cards in any lesson set.
                    </p>
                  </div>

                  <div
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      if (event.currentTarget === event.target) setDragActive(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                      void handleFiles(event.dataTransfer.files);
                    }}
                    className={`rounded-3xl border-2 border-dashed p-7 text-center transition ${
                      dragActive ? "border-[#6f9662] bg-white" : "border-[#b9cbb1] bg-white/70"
                    }`}
                  >
                    <UploadCloud className="mx-auto text-[#64845a]" size={34} />
                    <p className="mt-3 font-semibold">
                      {dragActive ? "Release to upload your images" : "Drag and drop images here"}
                    </p>
                    <p className="mt-1 text-xs text-[#6b756b]">JPEG, PNG, or WebP · up to 10 MB each · multiple files supported</p>
                    <div className="my-4 flex items-center gap-3" aria-hidden="true">
                      <span className="h-px flex-1 bg-black/10" />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a847a]">or</span>
                      <span className="h-px flex-1 bg-black/10" />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5"
                      disabled={!isPremium}
                    >
                      <Search size={17} />
                      Search files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        if (event.target.files) void handleFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </div>
                </div>
              </section>

              {error ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}
              {notice ? (
                <div className="fixed bottom-6 right-6 z-[160] flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-xl">
                  <Check size={17} /> {notice}
                </div>
              ) : null}

              {uploadJobs.length > 0 ? (
                <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {uploadJobs.map((job) => (
                    <div key={job.id} className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm">
                      <img src={job.previewUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{job.name}</p>
                        {job.status === "uploading" ? (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6b756b]"><Loader2 size={13} className="animate-spin" /> Processing and uploading…</p>
                        ) : (
                          <p className="mt-1 text-xs text-red-600">{job.error}</p>
                        )}
                      </div>
                      {job.status === "error" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUploadJobs((current) => current.filter((item) => item.id !== job.id));
                            releasePreview(job.previewUrl);
                          }}
                          className="rounded-full p-2 text-[#6b756b] hover:bg-black/5"
                          aria-label={`Dismiss ${job.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </section>
              ) : null}

              <section className="mt-10">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#718367]"><Images size={16} /> My images</div>
                    <h2 className="mt-1 text-2xl font-bold">Create new cards</h2>
                  </div>
                  <span className="text-sm text-[#6b756b]">{images.length} of 500 images</span>
                </div>

                {loadingLibrary ? (
                  <div className="flex items-center justify-center py-20 text-[#6b756b]"><Loader2 className="mr-2 animate-spin" /> Loading your library…</div>
                ) : images.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-black/15 bg-white/60 py-16 text-center text-[#6b756b]">
                    <ImagePlus className="mx-auto mb-3" /> Upload your first image to begin.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {images.map((image) => {
                      const usedByCards = cardsByImageId.get(image.id) ?? 0;
                      return (
                        <article key={image.id} className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
                          <div className="aspect-[4/3] bg-[#eef0e7] p-3">
                            <img src={image.imageUrl} alt={image.originalFilename} className="h-full w-full rounded-2xl object-contain" />
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="min-w-0 truncate text-xs text-[#6b756b]" title={image.originalFilename}>{image.originalFilename}</p>
                              <button
                                type="button"
                                onClick={() => void removeImage(image)}
                                disabled={deletingId === image.id || usedByCards > 0}
                                title={usedByCards > 0 ? "Delete its cards first" : "Delete image"}
                                className="rounded-full p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                {deletingId === image.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                              </button>
                            </div>
                            <label className="mt-3 block text-sm font-semibold" htmlFor={`draft-${image.id}`}>Card text</label>
                            <div className="mt-2 grid gap-2">
                              <input
                                id={`draft-${image.id}`}
                                value={drafts[image.id] ?? ""}
                                onChange={(event) => setDrafts((current) => ({ ...current, [image.id]: event.target.value }))}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") void saveCardForImage(image);
                                }}
                                maxLength={200}
                                placeholder="e.g. my classroom"
                                className="min-w-0 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8dad80]"
                              />
                              <div className="flex gap-2">
                                <select
                                  value={draftTypes[image.id] ?? ""}
                                  onChange={(event) => setDraftTypes((current) => ({ ...current, [image.id]: event.target.value as CreatorCardType | "" }))}
                                  aria-label="Content type"
                                  className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8dad80]"
                                >
                                  <option value="" disabled>Choose content type</option>
                                  {CARD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => void saveCardForImage(image)}
                                  disabled={savingImageId === image.id || !String(drafts[image.id] ?? "").trim() || !draftTypes[image.id]}
                                  className="btn btn-primary px-3 disabled:opacity-50"
                                  aria-label="Save card"
                                >
                                  {savingImageId === image.id ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                                </button>
                              </div>
                            </div>
                            <p className="mt-2 text-xs text-[#7a847a]">{usedByCards} saved {usedByCards === 1 ? "card" : "cards"} using this image</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="mt-12 pb-16">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#718367]">Private card library</div>
                    <h2 className="mt-1 text-2xl font-bold">My Uploads</h2>
                  </div>
                  {cards.length > 0 ? (
                    <button type="button" onClick={() => addCardsToTray(cards)} className="btn btn-primary px-5 py-2.5">Add all to lesson tray</button>
                  ) : null}
                </div>

                {cards.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-black/15 bg-white/60 py-14 text-center text-[#6b756b]">Cards you create will appear here and under Flashcards → My Uploads.</div>
                ) : (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {cards.map((card) => (
                      <article key={card.id} className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
                        <div className="aspect-square rounded-2xl bg-[#eef0e7] p-2">
                          <img src={card.image.imageUrl} alt={card.front} className="h-full w-full rounded-xl object-contain" />
                        </div>
                        <input
                          value={cardEdits[card.id] ?? card.front}
                          onChange={(event) => setCardEdits((current) => ({ ...current, [card.id]: event.target.value }))}
                          maxLength={200}
                          className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#8dad80]"
                        />
                        <select
                          value={cardTypeEdits[card.id] ?? card.cardType}
                          onChange={(event) => setCardTypeEdits((current) => ({ ...current, [card.id]: event.target.value as CreatorCardType }))}
                          aria-label={`Content type for ${card.front}`}
                          className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8dad80]"
                        >
                          {CARD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => addCardsToTray([card])} className="btn btn-primary flex-1 px-3 py-2 text-xs">Add to tray</button>
                          <button
                            type="button"
                            onClick={() => void saveCardEdit(card)}
                            disabled={savingCardId === card.id || ((cardEdits[card.id] ?? card.front).trim() === card.front && (cardTypeEdits[card.id] ?? card.cardType) === card.cardType)}
                            className="btn btn-secondary px-3 py-2"
                            aria-label={`Save ${card.front}`}
                          >
                            {savingCardId === card.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeCard(card)}
                            disabled={deletingId === card.id}
                            className="rounded-xl border border-red-100 px-3 py-2 text-red-500 hover:bg-red-50"
                            aria-label={`Delete ${card.front}`}
                          >
                            {deletingId === card.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {!busyLoading && user && access && !access.isPremium ? (
          <PremiumPreviewOverlay
            title="Creator is locked on the Free plan"
            description="Upgrade to Premium to upload private images, create your own flashcards, and mix them with Classendo cards in lesson sets."
          />
        ) : null}
      </main>
    </div>
  );
}
