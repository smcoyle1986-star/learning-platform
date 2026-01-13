export default function Page() {
  return <div className="p-10">Coming soon</div>;
}
const lessonTray = JSON.parse(
  localStorage.getItem("classbloom-lesson-tray") || "[]"
);