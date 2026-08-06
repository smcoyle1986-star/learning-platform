"use client";

import { useEffect, useMemo, useState } from "react";

type Slide = {
  path: string;
  alt: string;
  label: string;
  caption: string;
};

const SLIDE_CAPTIONS: Record<string, string> = {
  worksheets_1: "Worksheets to improve writing skills.",
  worksheets_2: "Fun worksheets to play in class.",
  flashcards_1: "Use vocabulary to easily build lessons.",
  flashcards_2: "Intuitive search to find vocabulary.",
  flashcards_3: "Different grammar and themes to use.",
  classroom_1: "Fullscreen images for classroom use.",
  classroom_2: "Clear images and text for students.",
  classroom_3: "Teacher can annotate images during class.",
  printables_1: "Easy to print flashcards for students to use.",
  dashboard_1: "Save your lesson sets for future use.",
  community_1: "Join the community to find and share lessons.",
  editor_1: "Edit flashcards to fit your lesson needs.",
  games_1: "Full classroom games for all levels to enjoy.",
  games_2: "Large images for easy game play.",
  games_3: "Interactive games designed for the classroom.",
  games_4: "Students practice as they play together.",
  games_5: "Simple and effective game design for classrooms.",
};

function isInformationSlide(path: string) {
  return path.startsWith("landing/information/");
}

const FALLBACK_SLIDES: Slide[] = [
  {
    path: "landing/classroom_1.png",
    alt: "Classendo landing slide: classroom 1",
    label: "classroom 1",
    caption: SLIDE_CAPTIONS.classroom_1,
  },
  {
    path: "landing/classroom_2.png",
    alt: "Classendo landing slide: classroom 2",
    label: "classroom 2",
    caption: SLIDE_CAPTIONS.classroom_2,
  },
  {
    path: "landing/classroom_3.png",
    alt: "Classendo landing slide: classroom 3",
    label: "classroom 3",
    caption: SLIDE_CAPTIONS.classroom_3,
  },
  {
    path: "landing/community_1.png",
    alt: "Classendo landing slide: community 1",
    label: "community 1",
    caption: SLIDE_CAPTIONS.community_1,
  },
  {
    path: "landing/dashboard_1.png",
    alt: "Classendo landing slide: dashboard 1",
    label: "dashboard 1",
    caption: SLIDE_CAPTIONS.dashboard_1,
  },
  {
    path: "landing/editor_1.png",
    alt: "Classendo landing slide: editor 1",
    label: "editor 1",
    caption: SLIDE_CAPTIONS.editor_1,
  },
  {
    path: "landing/flashcards_1.png",
    alt: "Classendo landing slide: flashcards 1",
    label: "flashcards 1",
    caption: SLIDE_CAPTIONS.flashcards_1,
  },
  {
    path: "landing/flashcards_2.png",
    alt: "Classendo landing slide: flashcards 2",
    label: "flashcards 2",
    caption: SLIDE_CAPTIONS.flashcards_2,
  },
  {
    path: "landing/flashcards_3.png",
    alt: "Classendo landing slide: flashcards 3",
    label: "flashcards 3",
    caption: SLIDE_CAPTIONS.flashcards_3,
  },
  {
    path: "landing/games_1.png",
    alt: "Classendo landing slide: games 1",
    label: "games 1",
    caption: SLIDE_CAPTIONS.games_1,
  },
  {
    path: "landing/games_2.png",
    alt: "Classendo landing slide: games 2",
    label: "games 2",
    caption: SLIDE_CAPTIONS.games_2,
  },
  {
    path: "landing/games_3.png",
    alt: "Classendo landing slide: games 3",
    label: "games 3",
    caption: SLIDE_CAPTIONS.games_3,
  },
  {
    path: "landing/games_4.png",
    alt: "Classendo landing slide: games 4",
    label: "games 4",
    caption: SLIDE_CAPTIONS.games_4,
  },
  {
    path: "landing/games_5.png",
    alt: "Classendo landing slide: games 5",
    label: "games 5",
    caption: SLIDE_CAPTIONS.games_5,
  },
  {
    path: "landing/printables_1.png",
    alt: "Classendo landing slide: printables 1",
    label: "printables 1",
    caption: SLIDE_CAPTIONS.printables_1,
  },
  {
    path: "landing/worksheets_1.png",
    alt: "Classendo landing slide: worksheets 1",
    label: "worksheets 1",
    caption: SLIDE_CAPTIONS.worksheets_1,
  },
  {
    path: "landing/worksheets_2.png",
    alt: "Classendo landing slide: worksheets 2",
    label: "worksheets 2",
    caption: SLIDE_CAPTIONS.worksheets_2,
  },
];

export default function LandingCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotationKey, setRotationKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/landing-images", { cache: "no-store" });
        const json = (await response.json().catch(() => ({}))) as { slides?: Array<{ path: string; label?: string }> };
        if (cancelled) return;

        const apiSlides =
          Array.isArray(json.slides) && json.slides.length > 0
            ? json.slides
                .filter((slide) => !isInformationSlide(slide.path))
                .map((slide) => ({
                  path: slide.path,
                  alt: slide.label ? `Classendo landing slide: ${slide.label}` : "Classendo landing carousel slide",
                  label: slide.label ?? "",
                  caption: SLIDE_CAPTIONS[slide.label?.replace(/\s+/g, "_") ?? ""] ?? "",
                }))
            : [];

        const nextSlides = apiSlides.length > 0 ? apiSlides : FALLBACK_SLIDES;

        setSlides(nextSlides);
        setActiveIndex(0);
      } catch {
        if (!cancelled) {
          setSlides(FALLBACK_SLIDES);
          setActiveIndex(0);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [slides.length, rotationKey]);

  const carouselSlides = useMemo(() => (slides.length > 0 ? slides : FALLBACK_SLIDES), [slides]);
  const effectiveActiveIndex = activeIndex < carouselSlides.length ? activeIndex : 0;
  const activeSlide = carouselSlides[effectiveActiveIndex];

  return (
    <div className="flex h-[420px] flex-col rounded-3xl bg-gradient-to-br from-[#dfe8d1] to-[#cfd9c1] p-4 shadow-[0_18px_40px_rgba(54,64,46,0.12)] ring-1 ring-black/5">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem]">
        {carouselSlides.map((slide, index) => {
          const active = index === effectiveActiveIndex;
          return (
            <div
              key={slide.path}
              className={`absolute inset-0 flex items-center justify-center p-1 transition-opacity duration-1000 ease-in-out ${
                active ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="h-full w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-xl backdrop-blur-sm">
                <img
                  src={`/api/landing-image?path=${encodeURIComponent(slide.path)}`}
                  alt={slide.alt}
                  className="h-full w-full object-contain object-center"
                />
              </div>
            </div>
          );
        })}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-black/5" />
      </div>

      <div className="mt-4 flex justify-center">
        <div className="max-w-[90%] rounded-full bg-white/85 px-5 py-3 text-center shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
          <span className="text-sm font-medium text-[#4f5d4f] transition-opacity duration-700">
            {activeSlide?.caption || "Explore Classendo"}
          </span>
        </div>
      </div>

      {carouselSlides.length > 1 && (
        <div className="mt-3 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-white/85 px-3 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
            {carouselSlides.map((slide, index) => (
              <button
                key={`${slide.path}-dot`}
                type="button"
                onClick={() => {
                  setActiveIndex(index);
                  setRotationKey((current) => current + 1);
                }}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  index === effectiveActiveIndex ? "scale-110 bg-[#4f6f52]" : "bg-white/80 hover:bg-white"
                }`}
                aria-label={`Show slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
