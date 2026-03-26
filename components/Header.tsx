"use client";

function getOrdinal(day: number) {
  if (day >= 11 && day <= 13) return "th";

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export default function Header() {
  const today = new Date();

  const month = today.toLocaleString("en-US", { month: "long" });
  const day = today.getDate();
  const year = today.getFullYear();

  const formattedDate = `Today, ${month} ${day}${getOrdinal(day)}, ${year}`;

  return (
    <div>
      <h1 className="text-[34px] font-bold text-[#F28C18]">Dashboard</h1>
      <p className="mt-1 text-[18px] text-black">{formattedDate}</p>

      <h2 className="mt-10 text-[42px] font-semibold tracking-[-0.02em] text-black">
        Welcome Back, Kama!
      </h2>
    </div>
  );
}
