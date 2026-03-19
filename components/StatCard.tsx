type StatCardProps = {
  title: string;
  value: number;
};

export default function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <h3 className="text-2xl font-medium text-gray-700">{title}</h3>
      <p className="mt-2 text-4xl font-bold">{value}</p>
    </div>
  );
}
