import Sidebar from "@/components/Sidebar";

type Bottle = {
  name: string;
  sku: string;
  category: string;
  supplier: string;
  currentStock: number;
  minimumStock: number;
  targetStock: number;
  unitPrice: number;
};

const bottles: Bottle[] = [
  {
    name: "Tanqueray No. Ten",
    sku: "GIN-09485",
    category: "Gin",
    supplier: "Urban Spirits",
    currentStock: 1,
    minimumStock: 2,
    targetStock: 5,
    unitPrice: 4200,
  },
  {
    name: "Campari",
    sku: "LIQ-09484",
    category: "Liqueur",
    supplier: "DealZone",
    currentStock: 2,
    minimumStock: 2,
    targetStock: 6,
    unitPrice: 3200,
  },
  {
    name: "Cointreau",
    sku: "LIQ-09483",
    category: "Liqueur",
    supplier: "BuyRight",
    currentStock: 5,
    minimumStock: 2,
    targetStock: 6,
    unitPrice: 3800,
  },
  {
    name: "Havana Club 3",
    sku: "RUM-09482",
    category: "Rum",
    supplier: "MetroShop",
    currentStock: 0,
    minimumStock: 2,
    targetStock: 4,
    unitPrice: 2600,
  },
  {
    name: "Ketel One",
    sku: "VOD-09481",
    category: "Vodka",
    supplier: "iBox Trading",
    currentStock: 4,
    minimumStock: 2,
    targetStock: 5,
    unitPrice: 3900,
  },
  {
    name: "Noilly Prat Dry",
    sku: "VER-09480",
    category: "Vermouth",
    supplier: "Urban Spirits",
    currentStock: 1,
    minimumStock: 2,
    targetStock: 4,
    unitPrice: 2400,
  },
];

const shoppingItems = bottles
  .filter((bottle) => bottle.currentStock <= bottle.minimumStock)
  .map((bottle) => {
    const suggestedOrder = Math.max(
      bottle.targetStock - bottle.currentStock,
      0
    );

    return {
      ...bottle,
      suggestedOrder,
      estimatedCost: suggestedOrder * bottle.unitPrice,
    };
  });

const totalEstimatedCost = shoppingItems.reduce(
  (sum, item) => sum + item.estimatedCost,
  0
);

function StockStatusBadge({
  currentStock,
  minimumStock,
}: {
  currentStock: number;
  minimumStock: number;
}) {
  const isOut = currentStock === 0;
  const isLow = currentStock <= minimumStock;

  const label = isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock";
  const colorClass = isOut
    ? "bg-[#FDECEC] text-[#C0392B]"
    : isLow
    ? "bg-[#FFF4DA] text-[#C47A00]"
    : "bg-[#E8F7EC] text-[#2E8B57]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[13px] font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

export default function ShoppingListPage() {
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
                Shopping List
              </h1>
              <span className="material-symbols-outlined text-gray-500">
                more_horiz
              </span>
            </div>

            <button className="rounded-xl bg-[#F28C18] px-5 py-3 text-[16px] font-semibold text-white shadow-sm">
              Export List
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#d7d7d7] bg-[#eef1f5] px-5 py-5 shadow-sm">
              <p className="text-[16px] text-gray-600">Items to Reorder</p>
              <p className="mt-2 text-[30px] font-bold text-black">
                {shoppingItems.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#d7d7d7] bg-[#eef1f5] px-5 py-5 shadow-sm">
              <p className="text-[16px] text-gray-600">Total Units to Order</p>
              <p className="mt-2 text-[30px] font-bold text-black">
                {shoppingItems.reduce(
                  (sum, item) => sum + item.suggestedOrder,
                  0
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-[#d7d7d7] bg-[#eef1f5] px-5 py-5 shadow-sm">
              <p className="text-[16px] text-gray-600">Estimated Cost</p>
              <p className="mt-2 text-[30px] font-bold text-black">
                ¥{totalEstimatedCost.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-b border-[#dddddd] pb-3">
            <div className="flex items-center gap-8">
              <button className="border-b-2 border-[#F28C18] pb-2 text-[17px] font-semibold text-black">
                Suggested Reorder
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

              <button className="flex h-11 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-black">
                Category
                <span className="material-symbols-outlined text-[18px]">
                  expand_more
                </span>
              </button>

              <button className="flex h-11 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-black">
                Supplier
                <span className="material-symbols-outlined text-[18px]">
                  expand_more
                </span>
              </button>

              <button className="flex h-11 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-black">
                Stock status
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
                  <th className="px-4 py-4 font-medium">Bottle name</th>
                  <th className="px-4 py-4 font-medium">SKU</th>
                  <th className="px-4 py-4 font-medium">Category</th>
                  <th className="px-4 py-4 font-medium">Supplier</th>
                  <th className="px-4 py-4 font-medium">Current Stock</th>
                  <th className="px-4 py-4 font-medium">Suggested Order</th>
                  <th className="px-4 py-4 font-medium">Unit Price</th>
                  <th className="px-4 py-4 font-medium">Estimated Cost</th>
                  <th className="px-4 py-4 font-medium"></th>
                </tr>
              </thead>

              <tbody>
                {shoppingItems.map((item) => (
                  <tr
                    key={item.sku}
                    className="border-t border-[#efefef] text-[15px] text-black"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-[#e8e8e8]" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">{item.sku}</td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[#f2f2f2] px-3 py-1 text-[13px] text-[#666]">
                        {item.category}
                      </span>
                    </td>

                    <td className="px-4 py-4">{item.supplier}</td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <span>{item.currentStock} unit</span>
                        <StockStatusBadge
                          currentStock={item.currentStock}
                          minimumStock={item.minimumStock}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {item.suggestedOrder} unit
                    </td>

                    <td className="px-4 py-4 text-[#666]">
                      ¥{item.unitPrice.toLocaleString()}
                    </td>

                    <td className="px-4 py-4 font-medium">
                      ¥{item.estimatedCost.toLocaleString()}
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

          {shoppingItems.length === 0 && (
            <div className="mt-8 rounded-2xl border border-[#d7d7d7] bg-white p-8 text-center">
              <p className="text-[20px] font-semibold text-black">
                Nothing to reorder right now
              </p>
              <p className="mt-2 text-[15px] text-gray-500">
                All bottles are above their minimum stock level.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
