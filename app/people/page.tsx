import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PeoplePage({ searchParams }: Props) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  qs.set("tab", "people");
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  redirect(`/buyers?${qs}`);
}
