"use client";

type AppLoadingScreenProps = {
  title: string;
  description: string;
  variant?: "admin" | "user" | "default";
  fullScreen?: boolean;
};

export default function AppLoadingScreen({
  title,
  description,
  variant = "default",
  fullScreen = false,
}: AppLoadingScreenProps) {
  const wrapperClassName = fullScreen
    ? "flex min-h-dvh flex-1 items-center justify-center px-6"
    : "flex min-h-[320px] w-full items-center justify-center px-6 py-10";

  const backgroundClassName =
    variant === "user"
      ? "bg-[radial-gradient(circle_at_top_right,_rgba(201,166,91,0.08),_transparent_22%),linear-gradient(180deg,_#F8FAFD_0%,_#F4F7FB_100%)]"
      : "bg-[#F8F9FB]";

  const spinnerTopColorClassName =
    variant === "user" ? "border-t-[#C9A65B]" : "border-t-[#0B1630]";

  return (
    <div className={`${wrapperClassName} ${backgroundClassName}`}>
      <div className="w-full max-w-md rounded-[28px] border border-[#E4EAF3] bg-white px-8 py-10 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div
          className={`mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#E9EEF6] ${spinnerTopColorClassName}`}
        />
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#14213D]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#667892]">
          {description}
        </p>
      </div>
    </div>
  );
}