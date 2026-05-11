"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type FarmPlot = {
  id: string;
  name: string;
};

type FarmDeviceResponse = {
  device: {
    name: string;
    status: "ONLINE" | "OFFLINE" | "FAULT";
    pumpState: "ON" | "OFF" | "FAULT";
    pumpControlMode: "AUTO" | "FORCE_ON" | "FORCE_OFF";
    offlineMessage?: string;
    pendingCommand?: {
      targetMode: "AUTO" | "FORCE_ON" | "FORCE_OFF";
    } | null;
  } | null;
  telemetry: Array<{
    id: string;
    temperatureC: number;
    humidityPercent: number;
    soilMoisturePercent: number;
    recordedAt: string;
  }>;
};

export function IotClient({ plots }: { plots: FarmPlot[] }) {
  const [selectedPlotId, setSelectedPlotId] = useState<string>(plots[0]?.id ?? "");
  const [deviceData, setDeviceData] = useState<FarmDeviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);

  useEffect(() => {
    if (!selectedPlotId) return;

    const fetchData = async () => {
      try {
        const data = await apiGet<FarmDeviceResponse>(`/farm-plots/${selectedPlotId}/device`);
        setDeviceData(data);
      } catch (err) {
        console.error("Failed to fetch device data", err);
      }
    };

    setLoading(true);
    fetchData().finally(() => setLoading(false));

    const interval = setInterval(fetchData, 1000); // poll every 1 second for realtime feel
    return () => clearInterval(interval);
  }, [selectedPlotId]);

  const handleCommand = async (mode: "AUTO" | "FORCE_ON" | "FORCE_OFF") => {
    if (!selectedPlotId || commandBusy) return;
    setCommandBusy(true);
    try {
      await apiPost(`/farm-plots/${selectedPlotId}/pump/commands`, { targetMode: mode });
    } catch (err) {
      console.error("Failed to issue command", err);
    } finally {
      setCommandBusy(false);
    }
  };

  const device = deviceData?.device;
  const latestTelemetry = deviceData?.telemetry?.at(-1);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Select Farm Plot
        </label>
        <select
          className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          value={selectedPlotId}
          onChange={(e) => setSelectedPlotId(e.target.value)}
        >
          {plots.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {!device && !loading ? (
        <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-800">
          No hardware linked to this plot. Link a device via the backend to see telemetry.
        </div>
      ) : device ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Card */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-200 space-y-4">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Device Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Connection</p>
                <p className={`font-bold ${device.status === 'ONLINE' ? 'text-green-600' : 'text-red-500'}`}>
                  {device.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Pump State</p>
                <p className={`font-bold ${device.pumpState === 'ON' ? 'text-blue-600' : 'text-gray-600'}`}>
                  {device.pumpState}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Control Mode</p>
                <p className="font-bold text-gray-800">{device.pumpControlMode}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Command</p>
                <p className="font-bold text-orange-500">
                  {device.pendingCommand ? device.pendingCommand.targetMode : "None"}
                </p>
              </div>
            </div>
          </div>

          {/* Telemetry Card */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-200 space-y-4">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Live Telemetry</h2>
            {latestTelemetry ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Soil Moisture</p>
                  <p className="text-2xl font-bold text-green-600">{latestTelemetry.soilMoisturePercent.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Temperature</p>
                  <p className="text-2xl font-bold text-orange-500">{latestTelemetry.temperatureC.toFixed(1)} °C</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Humidity</p>
                  <p className="text-2xl font-bold text-blue-500">{latestTelemetry.humidityPercent.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {new Date(latestTelemetry.recordedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Waiting for first reading...</p>
            )}
          </div>

          {/* Control Card */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-200 md:col-span-2">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-4 mb-4">Pump Controls</h2>
            <div className="flex gap-4">
              <button
                onClick={() => handleCommand("AUTO")}
                disabled={commandBusy}
                className="flex-1 py-3 px-4 bg-green-100 hover:bg-green-200 text-green-800 font-bold rounded-lg border border-green-300 transition-colors disabled:opacity-50"
              >
                Set to AUTO
              </button>
              <button
                onClick={() => handleCommand("FORCE_ON")}
                disabled={commandBusy}
                className="flex-1 py-3 px-4 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-lg border border-blue-300 transition-colors disabled:opacity-50"
              >
                FORCE ON
              </button>
              <button
                onClick={() => handleCommand("FORCE_OFF")}
                disabled={commandBusy}
                className="flex-1 py-3 px-4 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg border border-red-300 transition-colors disabled:opacity-50"
              >
                FORCE OFF
              </button>
            </div>
            {commandBusy && <p className="text-sm text-gray-500 mt-2">Sending command...</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
