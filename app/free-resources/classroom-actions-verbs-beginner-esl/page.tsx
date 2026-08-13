import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "classroom-actions-verbs-beginner-esl";
const cards = [{ id: "3ca697ff-4729-4331-ad48-acdd584dccd3", word: "listen carefully" }, { id: "3f4daf2f-19fb-42dd-8e5b-7581b80a2a0a", word: "look" }, { id: "82a00c28-08c2-4e4c-91eb-511e441d2feb", word: "read" }, { id: "be717c9b-a728-4d51-be66-c084816fde86", word: "draw" }, { id: "cc3060b9-d35a-4629-9df6-6f4b89c16a2b", word: "clap" }, { id: "9ea468c1-c9f2-4e54-9588-0dab683f541a", word: "answer" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Classroom Actions Verbs" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Classroom Actions Verbs", topic: "Classroom Actions", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Classroom Actions Wordsearch", activity: "Teacher Says", activityCopy: "", lessonCopy: "" }} />; }
