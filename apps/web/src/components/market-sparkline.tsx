import { ChartColumnBig } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Badge } from "./ui/badge";

type MarketSparklineRecord = {
  id?: string;
  mandiName: string;
  priceModal: number;
  priceMin?: number;
  priceMax?: number;
  distanceKm?: number | null;
};

type MarketSparklineData = {
  records?: MarketSparklineRecord[];
  bestRecord?: MarketSparklineRecord | null;
};

export function MarketSparkline({
  marketData,
}: {
  marketData: MarketSparklineData | null;
}) {
  if (!marketData?.bestRecord) return null;

  const records = Array.isArray(marketData.records)
    ? marketData.records.slice(0, 12)
    : [];
  const prices = records
    .map((record) => Number(record.priceModal))
    .filter((price: number) => Number.isFinite(price));
  const minPrice = prices.length
    ? Math.min(...prices)
    : (marketData.bestRecord.priceMin ?? marketData.bestRecord.priceModal);
  const maxPrice = prices.length
    ? Math.max(...prices)
    : (marketData.bestRecord.priceMax ?? marketData.bestRecord.priceModal);
  const rangeLabel =
    minPrice !== maxPrice
      ? `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`
      : formatCurrency(marketData.bestRecord.priceModal);
  
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-card to-card/50 p-5 shadow-sm border border-border">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Live Mandi Price</p>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight">{formatCurrency(marketData.bestRecord.priceModal)}</h3>
            <Badge tone="accent" className="h-6">
                <ChartColumnBig className="w-3 h-3 mr-1" />
                Best
            </Badge>
          </div>
          <p className="text-sm text-foreground/80 mt-1">{marketData.bestRecord.mandiName}</p>
        </div>
        
        {marketData.bestRecord.distanceKm != null && (
           <Badge tone="brand" className="bg-primary/20">{marketData.bestRecord.distanceKm.toFixed(1)} km away</Badge>
        )}
      </div>

      <div className="h-16 w-full flex items-end gap-1 opacity-70 hover:opacity-100 transition-opacity">
        {(prices.length ? prices : [marketData.bestRecord.priceModal]).map((price: number, i: number) => {
          const height =
            maxPrice === minPrice
              ? 72
              : 28 + ((price - minPrice) / (maxPrice - minPrice)) * 62;

          return (
          <div 
            key={i} 
            className="flex-1 rounded-t-sm"
            style={{ 
                height: `${height}%`, 
                backgroundColor: "var(--accent)" 
            }}
          />
        )})}
      </div>
      
      <p className="text-xs text-muted-foreground mt-3 text-right">
        Current result range: {rangeLabel}
      </p>
    </div>
  );
}
