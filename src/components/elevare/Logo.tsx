import logoAsset from "@/assets/elevare-logo.png.asset.json";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logoAsset.url}
        alt="Elevare Consultoria"
        className="h-9 w-9 object-contain brightness-0 invert"
      />
      {!compact && (
        <div className="flex flex-col -space-y-1">
          <span className="text-[20px] font-bold text-white tracking-tight leading-none">elevare</span>
          <span className="text-[8px] uppercase tracking-[0.2em] text-white/80 font-medium leading-none ml-[1px]">
            consultoria
          </span>
        </div>
      )}
    </div>
  );
}
