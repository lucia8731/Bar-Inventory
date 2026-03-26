import Sidebar from "@/components/Sidebar";

type Cocktail = {
  name: string;
  code: string;
  category: string;
  baseSpirit: string;
  price: number;
};

const cocktails: Cocktail[] = [
  {
    name: "Gin & Tonic",
    code: "CKT-1001",
    category: "Highball",
    baseSpirit: "Gin",
    price: 1200,
  },
  {
    name: "Martini",
    code: "CKT-1002",
    category: "Classic",
    baseSpirit: "Gin",
    price: 1600,
  },
  {
    name: "Negroni",
    code: "CKT-1003",
    category: "Classic",
    baseSpirit: "Gin",
    price: 1500,
  },
  {
    name: "Moscow Mule",
    code: "CKT-1004",
    category: "Long Drink",
    baseSpirit: "Vodka",
    price: 1300,
  },
  {
    name: "Daiquiri",
    code: "CKT-1005",
    category: "Sour",
    baseSpirit: "Rum",
    price: 1400,
  },
  {
    name: "Old Fashioned",
    code: "CKT-1006",
    category: "Classic",
    baseSpirit: "Whisky",
    price: 1700,
  },
];

export default function CocktailsPage() {
  return (
    <div className="flex min-h-screen bg-[#f3f3f3]">
      <Sidebar />

      <main className="flex-1 p-2">
        <div className="min-h-[calc(100vh-16px)] rounded-[34px] bg-[#f7f7f7] px-9 py-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[22px] text-black">
                menu
              </span>
              <h1 className="text-[36px] font-semibold text-black">
                Cocktails
              </h1>
              <span className="material-symbols-outlined text-gray-500">
                more_horiz
              </span>
            </div>

            <button className="rounded-xl bg-[#F28C18] px-5 py-3 text-[16px] font-semibold text-white shadow-sm">
              + Add Cocktail
            </button>
          </div>

          <div className="mt-8 flex items-center justify-between border-b border-[#dddddd] pb-3">
            <div className="flex items-center gap-8">
              <button className="border-b-2 border-[#F28C18] pb-2 text-[17px] font-semibold text-black">
                All Cocktails
              </button>
              <button className="pb-2 text-[17px] font-semibold text-black underline underline-offset-2">
                View
              </button>
            </div>

            <div className="flex items-center gap-3 text-[16px] font-medium text-black">
              <span className="material-symbols-outlined text-[20px]">
                settings
              </span>
              View Settings
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-[180px] items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-3">
                <span className="material-symbols-outlined text-[20px] text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full bg-transparent text-[15px] outline-none placeholder:text-gray-400"
                />
              </div>

              <button className="h-11 rounded-xl bg-[#21193B] px-4 text-[15px] font-medium text-white">
                Classics
              </button>

              <button className="flex h-11 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-black">
                Category
                <span className="material-symbols-outlined text-[18px]">
                  expand_more
                </span>
              </button>

              <button className="flex h-11 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-black">
                Base spirit
                <span className="material-symbols-outlined text-[18px]">
                  expand_more
                </span>
              </button>
            </div>

            <button className="flex h-11 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-black">
              <span className="material-symbols-outlined text-[18px]">
                table
              </span>
              Manage Table
            </button>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[#e1e1e1] bg-white">
            <table className="w-full border-collapse">
              <thead className="bg-[#f4f5f7]">
                <tr className="text-left text-[14px] text-[#666]">
                  <th className="px-4 py-4 font-medium">Cocktail name</th>
                  <th className="px-4 py-4 font-medium">Code</th>
                  <th className="px-4 py-4 font-medium">Category</th>
                  <th className="px-4 py-4 font-medium">Base spirit</th>
                  <th className="px-4 py-4 font-medium">Price</th>
                  <th className="px-4 py-4 font-medium"></th>
                </tr>
              </thead>

              <tbody>
                {cocktails.map((cocktail) => (
                  <tr
                    key={cocktail.code}
                    className="border-t border-[#efefef] text-[15px] text-black"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#FCE8D8]">
                          <span className="material-symbols-outlined text-[18px] text-[#C96F00]">
                            local_bar
                          </span>
                        </div>
                        <span className="font-medium">{cocktail.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">{cocktail.code}</td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[#f2f2f2] px-3 py-1 text-[13px] text-[#666]">
                        {cocktail.category}
                      </span>
                    </td>

                    <td className="px-4 py-4">{cocktail.baseSpirit}</td>

                    <td className="px-4 py-4 text-[#666]">
                      ¥{cocktail.price.toLocaleString()}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button className="text-gray-500">
                        <span className="material-symbols-outlined">
                          more_horiz
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
