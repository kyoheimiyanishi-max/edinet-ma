"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface Props {
  placeholder: string;
  action: string;
  paramName?: string;
  buttonColor?: "blue" | "purple" | "green" | "red" | "orange";
  defaultValue?: string;
}

const colorMap = {
  blue: {
    button: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25",
    ring: "focus:ring-blue-500/40 focus:border-blue-400",
  },
  purple: {
    button: "bg-purple-600 hover:bg-purple-700 shadow-purple-500/25",
    ring: "focus:ring-purple-500/40 focus:border-purple-400",
  },
  green: {
    button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25",
    ring: "focus:ring-emerald-500/40 focus:border-emerald-400",
  },
  red: {
    button: "bg-red-600 hover:bg-red-700 shadow-red-500/25",
    ring: "focus:ring-red-500/40 focus:border-red-400",
  },
  orange: {
    button: "bg-orange-600 hover:bg-orange-700 shadow-orange-500/25",
    ring: "focus:ring-orange-500/40 focus:border-orange-400",
  },
} as const;

export default function SimpleSearchForm({
  placeholder,
  action,
  paramName = "q",
  buttonColor = "blue",
  defaultValue,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(
    searchParams.get(paramName) ?? defaultValue ?? "",
  );

  const colors = colorMap[buttonColor];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set(paramName, value.trim());
    } else {
      params.delete(paramName);
    }
    params.delete("page");
    router.push(`${action}?${params}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${colors.ring} transition-all`}
        />
      </div>
      <button
        type="submit"
        className={`text-white px-6 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.97] shadow-md transition-all ${colors.button}`}
      >
        検索
      </button>
    </form>
  );
}
