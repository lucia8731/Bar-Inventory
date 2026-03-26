type StatCardProps = {
  title: string;
  value: number;
  icon: string;
};

export default function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#d7d7d7] bg-[#eef1f5] px-5 py-5 shadow-sm">
      <span className="material-symbols-outlined text-[40px] text-[#1B7895]">
        {icon}
      </span>

      <div>
        <h3 className="text-[18px] font-medium text-black leading-tight">
          {title}
        </h3>
        <p className="mt-1 text-[24px] font-bold leading-none text-black">
          {value}
        </p>
      </div>
    </div>
  );
}
