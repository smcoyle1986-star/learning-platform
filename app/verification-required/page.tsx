import { redirect } from "next/navigation";

export default function VerificationRequiredPage() {
  redirect("/dashboard");
}
