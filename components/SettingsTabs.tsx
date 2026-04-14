"use client";

import Link from "next/link";

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: readonly Tab[];
  active: string;
}

export default function SettingsTabs({ tabs, active }: Props) {
  return (
    <div className="border-b border-slate-200">
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={
              tab.id === "employees" ? "/settings" : `/settings?tab=${tab.id}`
            }
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              active === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
