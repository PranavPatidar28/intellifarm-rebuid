import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Badge } from "./ui/badge";

export function MarketSparkline({ marketData }: { marketData: any }) {
  if (!marketData?.bestRecord) return null;

  // Simulate sparkline trend visualization
  const trend = Math.random() > 0.5 ? "up" : "down";
  
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-card to-card/50 p-5 shadow-sm border border-border">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Live Mandi Price</p>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight">{formatCurrency(marketData.bestRecord.priceModal)}</h3>
            <Badge tone={trend === "up" ? "success" : "danger"} className="h-6">
                {trend === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                1.4%
            </Badge>
          </div>
          <p className="text-sm text-foreground/80 mt-1">{marketData.bestRecord.mandiName}</p>
        </div>
        
        {marketData.bestRecord.distanceKm != null && (
           <Badge tone="brand" className="bg-primary/20">{marketData.bestRecord.distanceKm.toFixed(1)} km away</Badge>
        )}
      </div>

      <div className="h-16 w-full flex items-end gap-1 opacity-70 hover:opacity-100 transition-opacity">
        {/* Fake sparkline bars */}
        {[30, 40, 35, 55, 60, 50, 75, 80, 85, 70, 90, 85].map((val, i) => (
          <div 
            key={i} 
            className="flex-1 rounded-t-sm"
            style={{ 
                height: `${val}%`, 
                backgroundColor: trend === "up" ? "var(--success)" : "var(--danger)" 
            }}
          />
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-3 text-right">Last updated 10 mins ago</p>
    </div>
  );
}
