export const metadata = {
  title: "Authentication — VajraX",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden bg-[#07090f] px-6 py-12">
      {/* circuit grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, #000 30%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, #000 30%, transparent 90%)",
        }}
      />
      <div
        className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,229,255,0.10) 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[560px] h-[560px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
