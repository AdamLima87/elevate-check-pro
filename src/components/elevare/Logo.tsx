import logoAsset from "@/assets/elevare-logo.png.asset.json";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logoAsset.url}
        alt="Elevare Consultoria"
        className="h-10 w-10 object-contain invert grayscale"
      />
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-bold text-white uppercase tracking-tight">Elevare</div>
          <div className="text-[10px] uppercase tracking-widest text-white/70 font-medium">
            Consultoria
          </div>
        </div>
      )}
    </div>
  );
}
