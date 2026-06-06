import { Leaf } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Leaf className="h-5 w-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-primary">Elevare</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Consultoria em Segurança dos Alimentos
          </div>
        </div>
      )}
    </div>
  );
}
