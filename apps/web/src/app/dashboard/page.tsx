import Link from "next/link";
import { Suspense } from "react";
import {
  Bot,
  Bug,
  Map as MapIcon,
  Sprout,
  Wind
} from "lucide-react";

import { LocationUpdater } from "@/components/location-updater";
import { EmptyState } from "@/components/empty-state";
import { MarketSparkline } from "@/components/market-sparkline";
import { DashboardPageTemplate } from "@/components/templates/dashboard-page-template";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { serverApiGet, serverApiPost } from "@/lib/api.server";

// Server fetchers wrapped in separate components for Suspense
async function MarketBentoBox({ cropName, locationQuery }: { cropName: string, locationQuery: string }) {
  const marketPath = `/markets?cropName=${encodeURIComponent(cropName)}${locationQuery ? `&${locationQuery}` : ""}`;
  const data = await serverApiGet<any>(marketPath);
  return <MarketSparkline marketData={data} />;
}

async function ResourceBentoBox({ cropSeasonId, lat, lng }: { cropSeasonId: string, lat?: string, lng?: string }) {
  const data = await serverApiPost<any>("/predictions/resources", {
        cropSeasonId,
        ...(lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : {}),
  });
  
  if (!data?.resourcePrediction) return <div className="h-full rounded-2xl bg-card border border-border p-5 text-muted-foreground">No resource prediction available.</div>;
  
  const { weeklyWaterMm, fertilizerNeed, pesticideNeedLevel } = data.resourcePrediction;
  
  return (
    <div className="flex flex-col justify-between h-full rounded-2xl bg-card border border-border p-5">
      <div>
         <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Input Readiness</p>
         <div className="grid gap-3">
             <div className="flex justify-between items-center pb-2 border-b border-border/50">
                 <span className="text-sm font-medium">Water Need</span>
                 <Badge tone="info">{weeklyWaterMm} mm</Badge>
             </div>
             <div className="flex justify-between items-center pb-2 border-b border-border/50">
                 <span className="text-sm font-medium">Fertilizer</span>
                 <span className="text-sm text-right text-muted-foreground truncate w-32">{fertilizerNeed}</span>
             </div>
             <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">Pesticide Risk</span>
                 <Badge tone={pesticideNeedLevel === "HIGH" ? "danger" : "brand"}>{pesticideNeedLevel}</Badge>
             </div>
         </div>
      </div>
    </div>
  )
}

function LivingFarmHero({ season }: { season: any }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-tr from-[#173827] to-[#214e38] p-8 text-[#f8fbf8] shadow-2xl col-span-1 lg:col-span-2 min-h-[320px] flex flex-col justify-end group">
       <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity bg-[radial-gradient(circle_at_top_right,rgba(200,138,44,0.4),transparent_50%)]" />
       <MapIcon className="absolute top-8 right-8 w-64 h-64 text-white/5 -rotate-12 translate-x-12 -translate-y-12" />
       
       <div className="relative z-10">
           <Badge tone="brand" className="mb-4 bg-white/10 text-white border-white/20">Active Plot GPS Locked</Badge>
           <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{season.farmPlotName}</h1>
           <p className="text-lg text-white/80 max-w-lg mb-6">
               Your {season.cropName} is currently in the <strong className="text-white">{season.currentStage}</strong> stage. Local atmospheric pressure dropping smoothly.
           </p>
           
           <div className="flex gap-3">
               <button className="h-10 px-6 rounded-full bg-white text-[#173827] font-semibold text-sm hover:scale-105 transition-transform shadow-lg">
                   Log Field Visit
               </button>
           </div>
       </div>
    </div>
  );
}

export default async function DashboardPage(props: {
  searchParams: Promise<{ latitude?: string; longitude?: string }>;
}) {
  const searchParams = await props.searchParams;
  const lat = searchParams?.latitude;
  const lng = searchParams?.longitude;

  const dashboardPath =
    lat && lng
      ? `/dashboard/weekly?latitude=${lat}&longitude=${lng}`
      : "/dashboard/weekly";
  const locationQuery = lat && lng ? `latitude=${lat}&longitude=${lng}&includeDistance=true` : "";

  const data = await serverApiGet<any>(dashboardPath);
  const featuredSeason = data?.seasons?.[0] ?? null;

  return (
    <>
      <LocationUpdater />
      <DashboardPageTemplate
        title="Intellifarm Hub"
        description="Your spatial dashboard powered by realtime field and market intelligence."
        actions={
          <Link href="/onboarding/farm" className={buttonStyles({ variant: "secondary" })}>
            Add Plot
          </Link>
        }
      >
        {!featuredSeason ? (
            <EmptyState
                title="No active crop season yet"
                description="Add your first plot."
                action={
                  <Link href="/onboarding/farm" className={buttonStyles({ variant: "primary" })}>Start onboarding</Link>
                }
             />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[1400px] mx-auto mt-6">
             <LivingFarmHero season={featuredSeason} />
             
             {/* Bento Box: Market Insights */}
             <div className="col-span-1 row-span-1 relative">
                <Suspense fallback={<div className="h-full min-h-[220px] rounded-2xl bg-card border border-border animate-pulse p-5">Loading markets...</div>}>
                   <MarketBentoBox cropName={featuredSeason.cropName} locationQuery={locationQuery} />
                </Suspense>
             </div>

             {/* Bento Box: Quick Support Shortcuts */}
             <div className="col-span-1 rounded-2xl bg-zinc-900 text-white p-5 flex flex-col justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Support OS</p>
                <div className="grid gap-2">
                      <Link href="/assistant" className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        <Bot className="h-5 w-5 text-zinc-300" />
                        <span className="font-semibold text-sm">Ask Copilot AI</span>
                      </Link>
                      <Link href="/disease-help" className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        <Bug className="h-5 w-5 text-zinc-300" />
                        <span className="font-semibold text-sm">Scan Crop Disease</span>
                      </Link>
                </div>
             </div>

             {/* Bento Box: Weather */}
             <div className="col-span-1 rounded-2xl bg-sky-50 dark:bg-sky-950 border border-sky-100 dark:border-sky-900 p-5 flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-start mb-2">
                       <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">Microclimate</p>
                       <Wind className="text-sky-500 w-5 h-5" />
                   </div>
                   <h2 className="text-4xl font-bold text-sky-900 dark:text-sky-100 mb-1">
                      {featuredSeason.weather?.currentTemperatureC ? `${featuredSeason.weather.currentTemperatureC}°` : '--°'}
                   </h2>
                   <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
                      {featuredSeason.weather?.forecastSummary || 'Gathering atmosphere data...'}
                   </p>
                </div>
                <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-xl">
                   <p className="text-xs text-sky-800 dark:text-sky-200 leading-relaxed">
                      {featuredSeason.weather?.advisories?.[0] || 'Conditions optimal for current stage.'}
                   </p>
                </div>
             </div>

             {/* Bento Box: Resource Prediction */}
             <div className="col-span-1 row-span-1">
                 <Suspense fallback={<div className="h-full min-h-[220px] rounded-2xl bg-card border border-border animate-pulse p-5">Loading resources...</div>}>
                     <ResourceBentoBox cropSeasonId={featuredSeason.cropSeasonId} lat={lat} lng={lng} />
                 </Suspense>
             </div>
          </div>
        )}
      </DashboardPageTemplate>
    </>
  );
}
