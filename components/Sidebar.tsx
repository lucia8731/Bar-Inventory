export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen border-r bg-[#f1f1f1] p-6">
      <h1 className="text-3xl font-bold text-aky-700">Bar Inventory</h1>
      <nav className="mt-10 space-y-4 text-xl">
        <p className="font-semibold text-orange-500">Dashboard</p>
        <p>Bottles</p>
        <p>Cocktails</p>
        <p>Shopping List</p>
        <p>Analytics</p>
      </nav>
    </aside>
  );
}
