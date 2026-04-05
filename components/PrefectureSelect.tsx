"use client";

import { useRouter } from "next/navigation";

interface Props {
  prefectures: string[];
  current?: string;
  basePath: string;
  extraParams?: Record<string, string>;
}

export default function PrefectureSelect({
  prefectures,
  current,
  basePath,
  extraParams,
}: Props) {
  const router = useRouter();

  const handleChange = (pref: string) => {
    const params = new URLSearchParams();
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        if (v) params.set(k, v);
      }
    }
    if (pref) params.set("prefecture", pref);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        都道府県
      </label>
      <select
        value={current || ""}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
      >
        <option value="">全国</option>
        {prefectures.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}
