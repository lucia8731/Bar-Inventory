import Sidebar from "@/components/Sidebar";

export default function AddBottlePage() {
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
                Add Bottle
              </h1>
              <span className="material-symbols-outlined text-gray-500">
                more_horiz
              </span>
            </div>

            <button className="rounded-xl border border-[#d8d8d8] bg-white px-5 py-3 text-[16px] font-semibold text-black shadow-sm">
              Cancel
            </button>
          </div>

          <div className="mt-8 max-w-5xl rounded-[28px] border border-[#dddddd] bg-white p-8 shadow-sm">
            <div className="border-b border-[#e8e8e8] pb-5">
              <h2 className="text-[28px] font-semibold text-black">
                Bottle Information
              </h2>
              <p className="mt-2 text-[16px] text-gray-500">
                Add a new bottle to your inventory. You can connect this form to
                your database later.
              </p>
            </div>

            <form className="mt-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Bottle Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tanqueray No. Ten"
                    className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Category
                  </label>
                  <select className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]">
                    <option>Gin</option>
                    <option>Vodka</option>
                    <option>Rum</option>
                    <option>Whisky</option>
                    <option>Tequila</option>
                    <option>Liqueur</option>
                    <option>Vermouth</option>
                    <option>Juice</option>
                    <option>Bitters</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Volume (ml)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 750"
                    className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 20"
                    className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Unit Price (¥)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 4200"
                    className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Image URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-medium text-black">
                  Notes
                </label>
                <textarea
                  placeholder="Add notes about this bottle..."
                  className="min-h-[120px] w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 py-3 text-[15px] outline-none focus:border-[#F28C18]"
                />
              </div>

              <div className="flex items-center justify-end gap-4 border-t border-[#e8e8e8] pt-6">
                <button
                  type="button"
                  className="rounded-xl border border-[#d8d8d8] bg-white px-5 py-3 text-[16px] font-medium text-black"
                >
                  Save as Draft
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#F28C18] px-6 py-3 text-[16px] font-semibold text-white shadow-sm"
                >
                  Save Bottle
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
