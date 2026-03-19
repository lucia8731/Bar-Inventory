import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-[#f6f6f6]">
      <Sidebar />

      <main className="flex-1 p-8">
        <Header />

        <section className="mt-8 grid grid-cols-4 gap-6">
          <StatCard title="Total Items" value={120} />
          <StatCard title="Low Stock Items" value={11} />
          <StatCard title="Out of Stock" value={8} />
          <StatCard title="Expired Items" value={3} />
        </section>

        <section className="my-8 grid grid-cols-2 gap-6">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-2xl font-semibold">Low Stock Items</h2>
            <div className="mt-4 h-64 rounded-xl bg-gray-50"></div>
          </div>
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-2xl font-semibold">Out of Stock</h2>
            <div className="mt-4 h-64 rounded-xl bg-gray-50"></div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-3xl font-bold">Quick Actions</h2>

          <div className="mt-4 grid grid-cols-2 gap-4 max-w-2xl">
            <button className="rounded-2xl border bg-white p-4 text-left text-xl font-medium">
              Add Bottle
            </button>
            <button className="rounded-2xl border bg-white p-4 text-left text-xl font-medium">
              Add Cocktail
            </button>
            <button className="rounded-2xl border bg-white p-4 text-left text-xl font-medium">
              Shopping List
            </button>
            <button className="rounded-2xl border bg-white p-4 text-left text-xl font-medium">
              View Analytics
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
