import Sidebar from "@/components/Sidebar";

type Bottle = {
  name: string;
  sku: string;
  category: string;
  stock: number;
  status: "Low" | "High";
  price: number;
};

const bottles: Bottle[] = [
  {
    name: "Tanqueray No. Ten",
    sku: "GIN-09485",
    category: "Gin",
    stock: 20,
    status: "Low",
    price: 4200,
  },
  {
    name: "Campari",
    sku: "LIQ-09484",
    category: "Liqueur",
    stock: 100,
    status: "High",
    price: 3200,
  },
  {
    name: "Cointreau",
    sku: "LIQ-09483",
    category: "Liqueur",
    stock: 40,
    status: "Low",
    price: 3800,
  },
  {
    name: "Havana Club 3",
    sku: "RUM-09482",
    category: "Rum",
    stock: 210,
    status: "High",
    price: 2600,
  },
  {
    name: "Ketel One",
    sku: "VOD-09481",
    category: "Vodka",
    stock: 180,
    status: "High",
    price: 3900,
  },
  {
    name: "Noilly Prat Dry",
    sku: "VER-09480",
    category: "Vermouth",
    stock: 70,
    status: "Low",
    price: 2400,
  },
];

function StockBadge({
  stock,
  status,
}: {
  stock: number;
  status: "Low" | "High";
}) {
  return (
    <div className="min-w-[120px]">
      <p className="text-[15px] text-black">
        <span className="font-medium">{stock} unit</span> ・ {status}
      </p>
      <div className="mt-2 h-1.5 w-[72px] rounded-full bg-[#dddddd]">
        <div
          className={`h-1.5 rounded-full ${
            status === "High" ? "bg-[#3BB54A]" : "bg-[#E53935]"
          }`}
          style={{ width: status === "High" ? "72px" : "24px" }}
        />
      </div>
    </div>
  );
}

export default function BottlesPage() {
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
              <h1 className="text-[36px] font-semibold text-black">Bottles</h1>
              <span className="material-symbols-outlined text-gray-500">
                more_horiz
              </span>
            </div>

            <button className="rounded-xl bg-[#F28C18] px-5 py-3 text-[16px] font-semibold text-white shadow-sm">
              + Add Bottle
            </button>
          </div>

          <div className="mt-8 flex items-center justify-between border-b border-[#dddddd] pb-3">
            <div className="flex items-center gap-8">
              <button className="border-b-2 border-[#F28C18] pb-2 text-[17px] font-semibold text-black">
                All Bottles
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
                2 Feb - 14 Apr
              </button>

              <button className="flex h-11 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-black">
                Category
                <span className="material-symbols-outlined text-[18px]">
                  expand_more
                </span>
              </button>

              <button className="flex h-11 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-black">
                Stock level
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
                  <th className="px-4 py-4 font-medium">Product name</th>
                  <th className="px-4 py-4 font-medium">SKU</th>
                  <th className="px-4 py-4 font-medium">Category</th>
                  <th className="px-4 py-4 font-medium">Stock</th>
                  <th className="px-4 py-4 font-medium">Current Stock</th>
                  <th className="px-4 py-4 font-medium">Unit Price</th>
                  <th className="px-4 py-4 font-medium"></th>
                </tr>
              </thead>

              <tbody>
                {bottles.map((bottle) => (
                  <tr
                    key={bottle.sku}
                    className="border-t border-[#efefef] text-[15px] text-black"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-[#e8e8e8]" />
                        <span className="font-medium">{bottle.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">{bottle.sku}</td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[#f2f2f2] px-3 py-1 text-[13px] text-[#666]">
                        {bottle.category}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <StockBadge stock={bottle.stock} status={bottle.status} />
                    </td>

                    <td className="px-4 py-4 text-[#666]">
                      ¥{bottle.price.toLocaleString()}
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
