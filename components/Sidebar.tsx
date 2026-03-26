"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const mainItemClass = (hrefs: string[]) =>
    `flex items-center justify-between px-4 py-3 transition-all duration-150 border-r-4 rounded-l-xl ${
      hrefs.includes(pathname)
        ? "bg-[#FFF4DA] text-[#FF8E1E] border-r-[#FF8E1E]"
        : "bg-transparent text-black border-r-transparent hover:text-[#FF8E1E]"
    }`;

  const subItemClass = (href: string) =>
    `block pl-14 py-1 text-[16px] transition-colors duration-150 ${
      pathname === href
        ? "text-[#FF8E1E] font-medium"
        : "text-black hover:text-[#FF8E1E]"
    }`;

  return (
    <aside className="w-[248px] min-h-screen border-r border-[#e2e2e2] bg-[#f3f3f3] px-0 py-6">
      <div className="px-6">
        <h1 className="text-[24px] font-medium text-[#1B7895]">BarInventory</h1>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-[#ececec] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f5] text-[12px] font-semibold text-[#2f7f5f]">
              A10
            </div>
            <span className="text-[18px] font-medium text-black">A10</span>
          </div>

          <span className="material-symbols-outlined text-[#1B7895]">
            expand_more
          </span>
        </div>
      </div>

      <div className="mt-10 px-2">
        <p className="px-4 text-sm text-gray-500">Main Menu</p>

        <nav className="mt-3 space-y-2 text-xl">
          <Link href="/" className={mainItemClass(["/"])}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#1B7895]">
                dashboard
              </span>
              <span className={pathname === "/" ? "font-semibold" : ""}>
                Dashboard
              </span>
            </div>
          </Link>

          <div>
            <Link
              href="/bottles"
              className={mainItemClass(["/bottles", "/bottles/add"])}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#1B7895]">
                  liquor
                </span>
                <span
                  className={
                    pathname === "/bottles" || pathname === "/bottles/add"
                      ? "font-semibold"
                      : ""
                  }
                >
                  Bottles
                </span>
              </div>
            </Link>

            <div className="mt-2 space-y-1">
              <Link href="/bottles" className={subItemClass("/bottles")}>
                All Bottles
              </Link>
              <Link
                href="/bottles/add"
                className={subItemClass("/bottles/add")}
              >
                Add Bottle
              </Link>
            </div>
          </div>

          <div>
            <Link
              href="/cocktails"
              className={mainItemClass(["/cocktails", "/cocktails/add"])}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#1B7895]">
                  local_bar
                </span>
                <span
                  className={
                    pathname === "/cocktails" || pathname === "/cocktails/add"
                      ? "font-semibold"
                      : ""
                  }
                >
                  Cocktails
                </span>
              </div>
            </Link>

            <div className="mt-2 space-y-1">
              <Link href="/cocktails" className={subItemClass("/cocktails")}>
                All Cocktails
              </Link>
              <Link
                href="/cocktails/add"
                className={subItemClass("/cocktails/add")}
              >
                Add Cocktail
              </Link>
            </div>
          </div>

          <Link
            href="/shopping-list"
            className={mainItemClass(["/shopping-list"])}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#1B7895]">
                shopping_cart
              </span>
              <span
                className={pathname === "/shopping-list" ? "font-semibold" : ""}
              >
                Shopping List
              </span>
            </div>
          </Link>

          <Link href="/sales" className={mainItemClass(["/sales"])}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#1B7895]">
                bar_chart_4_bars
              </span>
              <span className={pathname === "/sales" ? "font-semibold" : ""}>
                Analytics
              </span>
            </div>
          </Link>
        </nav>
      </div>

      <div className="mt-20 px-2">
        <p className="px-4 text-sm text-gray-500">Help & Settings</p>
        <nav className="mt-3 space-y-2 text-xl">
          <Link href="/help" className={mainItemClass(["/help"])}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#1B7895]">
                help
              </span>
              <span className={pathname === "/help" ? "font-semibold" : ""}>
                Help & Center
              </span>
            </div>
          </Link>

          <Link href="/settings" className={mainItemClass(["/settings"])}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#1B7895]">
                settings
              </span>
              <span className={pathname === "/settings" ? "font-semibold" : ""}>
                Settings
              </span>
            </div>
          </Link>
        </nav>
      </div>
    </aside>
  );
}
