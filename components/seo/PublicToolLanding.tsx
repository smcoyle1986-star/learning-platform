import Link from "next/link";

import TopicFlashcardPicker from "@/components/flashcards/TopicFlashcardPicker";
import { TOPICS } from "@/lib/seo/topics";
import { getFeaturedWeeklyGameId, getFeaturedWeeklyWorksheetType } from "@/lib/billing/featured";
import { WORKSHEET_TYPES } from "@/lib/worksheets/types";

const FEATURED_GAME_DETAILS: Record<string, { title: string; description: string; image?: string }> = {
  "image-reveal": { title: "Image Reveal", description: "Reveal the picture a little at a time while your class guesses the word.", image: "/games/image-reveal-art.png" },
  kaboom: { title: "KaBoom!", description: "Choose a square, answer together, and avoid the KaBoom card.", image: "/games/kaboom-art.png" },
  "spin-and-speak": { title: "Spin and Speak", description: "Spin for a quick speaking prompt using your lesson cards.", image: "/games/spin-and-speak-art.png" },
  "yes-or-no": { title: "Yes or No?", description: "Use a fast whole-class decision game with your vocabulary.", image: "/games/yes-or-no-art.png" },
  "choose-your-side": { title: "Choose Your Side", description: "Invite learners to move to the side that matches their answer.", image: "/games/choose-your-side-art.png" },
  "four-corners": { title: "Four Corners", description: "Turn your vocabulary cards into a movement activity around the room.", image: "/games/four-corners-art.png" },
  "memory-flip": { title: "Memory Flip", description: "Match pairs of visual vocabulary cards with your class.", image: "/games/memory-flip-art.png" },
  "connect-four": { title: "Connect Four", description: "Answer with your lesson cards and connect four tokens to win.", image: "/games/connect-four-art.png" },
  conquer: { title: "Conquer", description: "Claim spaces on a large board as teams practise vocabulary.", image: "/games/conquer-art.png" },
  "whack-a-word": { title: "Whack-a-Word", description: "Spot the right vocabulary word before it disappears." },
};

type Tool = "games" | "worksheets" | "community";

const toolContent = {
  games: {
    eyebrow: "Classendo for ESL teachers",
    title: "Interactive ESL classroom games and vocabulary activities",
    description: "Turn a small set of visual vocabulary cards into an interactive, teacher-led classroom game. Build a free lesson set first, then choose an activity that suits your class.",
    benefits: [
      ["Image Reveal", "Reveal a picture gradually while learners guess the word."],
      ["Memory Flip", "Match visual vocabulary cards for a focused review activity."],
      ["Spin and Speak", "Use a simple prompt to get learners speaking and moving."],
    ],
  },
  worksheets: {
    eyebrow: "Classendo for ESL teachers",
    title: "Free ESL vocabulary worksheets for the classroom",
    description: "Choose vocabulary in Flashcards, then turn the same set into a free printable classroom worksheet. Classendo helps you prepare matching, word-search, reading, writing, and other practice activities without rebuilding the content.",
    benefits: [
      ["One shared lesson set", "Keep the vocabulary consistent from introduction to follow-up practice."],
      ["Flexible activities", "Choose an activity that works for your learners and the time available."],
      ["Ready to print", "Preview, save, and export resources when your worksheet is ready."],
    ],
  },
  community: {
    eyebrow: "Classendo teacher community",
    title: "Share and reuse ESL teaching resources",
    description: "Classendo Community is a library of teacher-made lesson sets and worksheets. Sign in to browse resources, preview a useful idea, and copy it to My Lessons for adapting in class.",
    benefits: [
      ["Lesson sets", "Find visual vocabulary collections prepared by other teachers."],
      ["Worksheets", "Explore classroom practice activities that can be adapted for your group."],
      ["My Lessons", "Save a useful resource, then make it your own before teaching."],
    ],
  },
} as const;

export function PublicToolLanding({ tool }: { tool: Tool }) {
  const content = toolContent[tool];
  const nextPath = tool === "community" ? "/teacher/community" : `/${tool}`;
  const primaryLabel = tool === "community" ? "Explore Community" : `Open ${tool === "games" ? "Games" : "Worksheet Maker"}`;
  const featuredGame = FEATURED_GAME_DETAILS[getFeaturedWeeklyGameId()] ?? FEATURED_GAME_DETAILS["image-reveal"];
  const featuredWorksheet = WORKSHEET_TYPES.find((item) => item.id === getFeaturedWeeklyWorksheetType());
  const featuredTitle = tool === "games" ? featuredGame?.title : featuredWorksheet?.label;
  const featuredDescription = tool === "games" ? featuredGame?.description : featuredWorksheet?.description;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f7f6f2] px-6 py-14 text-[#2f3a2f]">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d8160]">{content.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">{content.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5c665c]">{content.description}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="btn btn-primary px-5 py-3">Create a free account</Link>
          <Link href="/flashcards" className="btn btn-secondary px-5 py-3">Build a flashcard set first</Link>
        </div>

        {tool === "games" || tool === "worksheets" ? (
          <section className="mt-10 overflow-hidden rounded-[2rem] border border-[#d8e5ce] bg-[linear-gradient(135deg,#f4f9ef_0%,#ffffff_52%,#fff8e7_100%)] p-5 shadow-[0_16px_38px_rgba(88,133,72,0.12)] md:p-6">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_200px] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#bdd4ac] bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#4d6e3d]">Free with an account</span>
                  <span className="text-sm font-semibold text-[#6d8160]">This week&apos;s featured {tool === "games" ? "game" : "worksheet"}</span>
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                  {tool === "games" ? `Play ${featuredTitle} free this week` : `Make a ${featuredTitle} worksheet free this week`}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5c665c]">{featuredDescription} Create a free account, add your own lesson cards, then use this classroom activity at no cost. The featured activity changes each week.</p>
                <Link href="/signup?next=%2Fflashcards" className="btn btn-primary mt-4 px-5 py-3 text-sm">Create a free account</Link>
              </div>
              {tool === "games" && featuredGame?.image ? (
                <img src={featuredGame.image} alt={`${featuredGame.title} game preview`} className="mx-auto aspect-[4/3] w-full max-w-[200px] rounded-2xl border border-white/80 bg-white object-cover shadow-sm" />
              ) : tool === "games" ? (
                <div className="mx-auto grid aspect-[4/3] w-full max-w-[200px] place-items-center rounded-2xl border border-[#dce6d6] bg-white p-5 text-center shadow-[0_12px_28px_rgba(54,64,46,0.12)]">
                  <span className="text-sm font-black text-[#426139]">{featuredTitle}</span>
                </div>
              ) : (
                <div aria-label={`${featuredTitle} worksheet preview`} className="mx-auto w-full max-w-[180px] rounded-2xl border border-[#dce6d6] bg-white p-3 shadow-[0_12px_28px_rgba(54,64,46,0.12)]">
                  <div className="rounded-lg border border-[#dce8d5] bg-[#fbfcfa] p-3">
                    <div className="text-center text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#5d7550]">Classendo worksheet</div>
                    <div className="mt-2 text-center text-sm font-black text-[#314031]">{featuredTitle}</div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5">{Array.from({ length: 9 }, (_, index) => <span key={index} className={`aspect-square rounded-md border ${index === 4 ? "border-[#bcd8ab] bg-[#e9f5df]" : "border-[#e1e6dc] bg-white"}`} />)}</div>
                    <div className="mt-3 h-1.5 rounded-full bg-[#dce8d5]" />
                    <div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-[#e8eee4]" />
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {content.benefits.map(([title, detail]) => (
            <article key={title} className="rounded-3xl border border-[#e2e6da] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#5c665c]">{detail}</p>
            </article>
          ))}
        </div>

        <section className="mt-14 border-t border-[#e2e6da] pt-10" aria-labelledby="topic-links-heading">
          <h2 id="topic-links-heading" className="text-2xl font-semibold">Start with an ESL vocabulary topic</h2>
          <p className="mt-3 max-w-3xl leading-7 text-[#5c665c]">Each topic includes useful vocabulary and a practical classroom activity idea. Open a topic, then use its vocabulary to build a lesson in Classendo.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((topic) => (
              <li key={topic.slug}>
                <Link href={`/topics/${topic.slug}`} className="block rounded-2xl border border-[#e2e6da] bg-white px-5 py-4 font-semibold transition hover:border-[#bdc9b5] hover:shadow-sm">
                  {topic.shortTitle} ESL activities
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-sm text-[#5c665c]">Already have an account? <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-[#506a47] underline underline-offset-4">Log in to {primaryLabel.toLowerCase()}</Link>.</p>
      </section>
    </main>
  );
}

export function FlashcardsSearchGuide() {
  return (
    <section className="border-t border-[#dce6d5] bg-[#f7f6f2] px-6 py-14 text-[#2f3a2f]" aria-labelledby="flashcard-guide-heading">
      <div className="mx-auto max-w-6xl">
        <h2 id="flashcard-guide-heading" className="text-3xl font-semibold tracking-tight">Free interactive ESL flashcards by topic</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#5c665c]">Classendo&apos;s illustrated flashcards help teachers introduce and practise beginner English vocabulary. Guests can create a temporary lesson of up to six cards. Sign in free to load a complete topic set into your tray, then use it in Interactive Classroom, games, printables, worksheets, and lesson plans.</p>
        <TopicFlashcardPicker topics={TOPICS} />
        <p className="mt-8 text-sm leading-6 text-[#5c665c]">Looking for ready-made teaching materials? Browse <Link href="/free-resources" className="font-semibold text-[#506a47] underline underline-offset-4">free ESL lesson packs</Link>.</p>
      </div>
    </section>
  );
}

export function ClassroomModeSearchGuide() {
  return (
    <section className="bg-[#f7f6f2] px-6 py-14 text-[#2f3a2f]" aria-labelledby="classroom-mode-guide-heading">
      <div className="mx-auto max-w-6xl">
        <h2 id="classroom-mode-guide-heading" className="text-3xl font-semibold tracking-tight">Free interactive flashcards for the ESL classroom</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#5c665c]">Classroom Mode presents the visual vocabulary cards in your lesson tray as large interactive flashcards. Use the arrows, shuffle controls, fullscreen view, and drawing tools to introduce words, review vocabulary, and lead whole-class English activities.</p>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[#5c665c]">Start by choosing free visual vocabulary cards in <Link href="/flashcards" className="font-semibold text-[#506a47] underline underline-offset-4">Flashcards</Link>, then bring the same set back to Classroom Mode whenever you teach.</p>
      </div>
    </section>
  );
}
