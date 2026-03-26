import Sidebar from "@/components/Sidebar";

export default function AddCocktailPage() {
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
                Add Cocktail
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
                Cocktail Information
              </h2>
              <p className="mt-2 text-[16px] text-gray-500">
                Add a new cocktail recipe to your collection.
              </p>
            </div>

            <form className="mt-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Cocktail Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Negroni"
                    className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Category
                  </label>
                  <select className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]">
                    <option>Classic</option>
                    <option>Highball</option>
                    <option>Sour</option>
                    <option>Long Drink</option>
                    <option>Short Drink</option>
                    <option>Tropical</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Base Spirit
                  </label>
                  <select className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]">
                    <option>Gin</option>
                    <option>Vodka</option>
                    <option>Rum</option>
                    <option>Whisky</option>
                    <option>Tequila</option>
                    <option>Brandy</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Price (¥)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1400"
                    className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-medium text-black">
                    Glass Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coupe"
                    className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 text-[15px] outline-none focus:border-[#F28C18]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-medium text-black">
                  Ingredients
                </label>
                <textarea
                  placeholder="e.g. 30ml Gin, 30ml Campari, 30ml Sweet Vermouth"
                  className="min-h-[120px] w-full rounded-xl border border-[#d8d8d8] bg-[#fafafa] px-4 py-3 text-[15px] outline-none focus:border-[#F28C18]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-medium text-black">
                  Method
                </label>
                <textarea
                  placeholder="Describe how to make the cocktail..."
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
                  Save Cocktail
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
