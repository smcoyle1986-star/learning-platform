import { ArrowLeft, MessageSquareHeart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function FeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/feedback");
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#f7f6f2] px-5 py-10 text-[#2f3a2f] sm:px-7 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#607357] hover:text-[#40543a]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Classendo
        </Link>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,0.7fr)_minmax(24rem,1.3fr)] lg:items-start">
          <section>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5efdf] text-[#5a774e]">
              <MessageSquareHeart aria-hidden="true" className="h-6 w-6" />
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">
              Help shape Classendo
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#2f3a2f]">
              Send feedback
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#697368]">
              Report a problem, suggest an improvement, or tell us where
              Classendo could support your teaching better.
            </p>
            <p className="mt-4 text-xs leading-5 text-[#858d83]">
              Feedback is linked to your signed-in account so we can understand
              the context. Please do not include passwords, payment details, or
              sensitive student information.
            </p>
          </section>

          <FeedbackForm />
        </div>
      </div>
    </main>
  );
}
