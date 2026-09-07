import { redirect } from "next/navigation";

export default function AnimalsDemoBullseyeCompletePage() {
  redirect("/worksheets?demo=animals&demo_complete=1");
}
