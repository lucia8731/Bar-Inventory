import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-[#f3f3f3]">
      <Sidebar />

      <main className="flex-1 p-2">
        <div className="min-h-[calc(100vh-16px)] rounded-[34px] bg-[#f7f7f7] px-9 py-8">
          <Header />

          <section className="mt-6 grid grid-cols-4 gap-6">
            <StatCard title="Total Items" value={120} icon="inventory_2" />
            <StatCard title="Low Stock Items" value={11} icon="error" />
            <StatCard
              title="Out of Stock"
              value={8}
              icon="remove_shopping_cart"
            />
            <StatCard title="Expired Items" value={3} icon="timer" />
          </section>

          <section className="mt-6 grid grid-cols-2 gap-7">
            <div className="rounded-2xl border border-[#d7d7d7] bg-[#f7f7f7] p-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[42px] text-[#E7C37D]">
                  error
                </span>
                <h2 className="text-[22px] font-semibold text-black">
                  Low Stock Items
                </h2>
              </div>

              <div className="mt-4 h-52 rounded-xl bg-transparent" />
            </div>

            <div className="rounded-2xl border border-[#d7d7d7] bg-[#f7f7f7] p-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[42px] text-[#E7C37D]">
                  remove_shopping_cart
                </span>
                <h2 className="text-[22px] font-semibold text-black">
                  Low Stock Items
                </h2>
              </div>

              <div className="mt-4 h-52 rounded-xl bg-transparent" />
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-[34px] font-bold text-black">Quick Actions</h2>

            <div className="mt-4 grid max-w-[760px] grid-cols-2 gap-4">
              <button className="flex items-center gap-4 rounded-2xl border border-[#d7d7d7] bg-[#eef1f5] px-4 py-4 text-left text-[18px] font-medium text-black shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#bfd9f4]">
                  <span className="material-symbols-outlined text-white">
                    add
                  </span>
                </span>
                Add Bottle
              </button>

              <button className="flex items-center gap-4 rounded-2xl border border-[#d7d7d7] bg-[#eef1f5] px-4 py-4 text-left text-[18px] font-medium text-black shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2d4d7]">
                  <span className="material-symbols-outlined text-white">
                    local_bar
                  </span>
                </span>
                Add Cocktail
              </button>

              <button className="flex items-center gap-4 rounded-2xl border border-[#d7d7d7] bg-[#eef1f5] px-4 py-4 text-left text-[18px] font-medium text-black shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#bfe2c4]">
                  <span className="material-symbols-outlined text-white">
                    shopping_cart
                  </span>
                </span>
                Shopping List
              </button>

              <button className="flex items-center gap-4 rounded-2xl border border-[#d7d7d7] bg-[#eef1f5] px-4 py-4 text-left text-[18px] font-medium text-black shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ead3a3]">
                  <span className="material-symbols-outlined text-white">
                    bar_chart
                  </span>
                </span>
                View Analytics
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
