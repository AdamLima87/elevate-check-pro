import logoAsset from "@/assets/elevare-logo.png.asset.json";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logoAsset.url}
        alt="Elevare Consultoria"
        className="h-10 w-10 object-contain"
      />
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-primary">Elevare</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Segurança dos Alimentos
          </div>
        </div>
      )}
    </div>
  );
}
