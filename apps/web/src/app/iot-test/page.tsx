import { serverApiGet } from "@/lib/api.server";
import { IotClient } from "./iot-client";

export type FarmPlotsResponse = {
  farmPlots: Array<{
    id: string;
    name: string;
    cropSeasons: Array<{
      cropName: string;
      status: string;
    }>;
  }>;
};

export default async function IotTestPage() {
  const data = await serverApiGet<FarmPlotsResponse>("/farm-plots");
  const plots = data?.farmPlots ?? [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold text-green-700 mb-6">
        Intellifarm IoT Tester
      </h1>
      <p className="text-gray-600 mb-8">
        Select a farm plot below to view live telemetry from the connected ESP32
        device and test pump override commands.
      </p>

      {plots.length === 0 ? (
        <div className="p-6 bg-white rounded-xl shadow border border-gray-200">
          <p className="text-gray-500">No farm plots found for your account.</p>
        </div>
      ) : (
        <IotClient plots={plots} />
      )}
    </div>
  );
}
