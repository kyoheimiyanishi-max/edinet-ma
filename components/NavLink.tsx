"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}

export default function NavLink({ href, children, exact }: Props) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`text-sm px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
        isActive
          ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
          : "text-blue-100 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
