import { redirect } from "next/navigation";

export default function TimePage() {
  redirect("/settings?tab=time");
}
