"use client";

import { useState } from "react";

interface Props {
  user: {
    name: string;
    email: string;
    image?: string;
  } | null;
}

export default function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initial = (user.name?.[0] ?? user.email[0]).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-7 h-7 rounded-full border-2 border-white/30"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            {initial}
          </span>
        )}
        <span className="text-xs text-blue-100 hidden sm:block max-w-[120px] truncate">
          {user.name}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-2 w-56">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition-colors"
              >
                ログアウト
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
