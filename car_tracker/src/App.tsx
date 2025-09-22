// src/App.tsx
import "leaflet/dist/leaflet.css";
import React, { useState } from "react";
import { MapPin, Truck, Clock, FileText, Route, Fuel } from "lucide-react";
import  MapComponent  from "./components/MapComponent";

interface TripFormData {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}

interface LogEntry {
  duty_status: string;
  duty_status_display?: string;
  start_hour: number;
  end_hour: number;
  location: string;
}

interface DailyLog {
  log_date: string;
  formatted_date?: string;
  day_number: number;
  total_miles: number;
  off_duty_hours: number;
  sleeper_berth_hours: number;
  driving_hours: number;
  on_duty_hours: number;
  entries?: LogEntry[];
}

export interface TripSegment {
  segment_type: string;
  segment_type_display?: string;
  sequence_number: number;
  start_time: string;
  end_time: string;
  formatted_start_time?: string;
  formatted_end_time?: string;
  duration_hours: number;
  distance_miles: number;
  location: string;
}

interface Routeummary {
  origin: string;
  destination: string;
  waypoints: string[];
  total_distance_miles: number;
  estimated_duration_hours: number;
  fuel_stops_needed: number;
  rest_stops_needed: number;
}

interface TripResult {
  id: number;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: string;
  total_distance: string;
  total_duration: string;
  fuel_stops: number;
  required_rest_stops: number;
  segments?: TripSegment[];
  daily_logs?: DailyLog[];
  route_summary?: Routeummary;
  created_at: string;
}

const App: React.FC = () => {
  const [formData, setFormData] = useState<TripFormData>({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    current_cycle_used: 0,
  });

  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "current_cycle_used" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8000/api/trips/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create trip");
      }

      const result: TripResult = await response.json();
      setTripResult(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error("API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (hour: number): string => {
    const hours = Math.floor(hour);
    const minutes = Math.round((hour - hours) * 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const getDutyStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      driving: "bg-red-500",
      on_duty_not_driving: "bg-yellow-500",
      sleeper_berth: "bg-blue-500",
      off_duty: "bg-gray-500",
    };
    return colors[status] || "bg-gray-300";
  };

  const getSegmentTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      driving: "bg-red-500",
      fuel: "bg-yellow-500",
      pickup: "bg-green-500",
      dropoff: "bg-green-600",
      sleeper_berth: "bg-blue-500",
      rest_break: "bg-purple-500",
    };
    return colors[type] || "bg-gray-300";
  };

  const renderELDGrid = (dailyLog: DailyLog) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Day {dailyLog.day_number} -{" "}
            {dailyLog.formatted_date || dailyLog.log_date}
          </h3>
          <div className="text-sm text-gray-600">
            Total Miles: {dailyLog.total_miles}
          </div>
        </div>

        {/* ELD Grid Header */}
        <div className="mb-2">
          <h4 className="text-md font-medium mb-2">
            Electronic Logging Device (ELD) Grid
          </h4>
          <div className="text-xs text-gray-600 mb-2">
            Hours shown in 24-hour format. Each colored bar represents duty
            status during that time period.
          </div>
        </div>

        {/* ELD Grid */}
        <div className="border rounded overflow-x-auto">
          <div className="min-w-full">
            {/* Hour Headers */}
            <div className="flex bg-gray-100 border-b">
              <div className="w-32 p-2 text-xs font-semibold border-r">
                Duty Status
              </div>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="w-8 p-1 text-xs text-center border-r"
                >
                  {hour.toString().padStart(2, "0")}
                </div>
              ))}
            </div>

            {/* Duty Status Rows */}
            {[
              { label: "Off Duty", status: "off_duty" },
              { label: "Sleeper Berth", status: "sleeper_berth" },
              { label: "Driving", status: "driving" },
              { label: "On Duty (Not Driving)", status: "on_duty_not_driving" },
            ].map(({ label, status }) => (
              <div key={label} className="flex border-b">
                <div className="w-32 p-2 text-xs font-medium border-r bg-gray-50 flex items-center">
                  {label}
                </div>
                {hours.map((hour) => {
                  const entry = dailyLog.entries?.find(
                    (e) =>
                      hour >= Math.floor(e.start_hour) &&
                      hour < Math.ceil(e.end_hour) &&
                      e.duty_status === status
                  );

                  return (
                    <div
                      key={`${status}-${hour}`}
                      className={`w-8 h-6 border-r ${
                        entry
                          ? getDutyStatusColor(entry.duty_status)
                          : "bg-white"
                      }`}
                      title={
                        entry
                          ? `${entry.location} (${formatTime(
                              entry.start_hour
                            )} - ${formatTime(entry.end_hour)})`
                          : ""
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Daily Totals */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-red-50 rounded">
            <div className="font-semibold text-red-700">Driving</div>
            <div className="text-lg">{dailyLog.driving_hours}h</div>
            <div className="text-xs text-gray-600">Max: 11h</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <div className="font-semibold text-yellow-700">On Duty</div>
            <div className="text-lg">{dailyLog.on_duty_hours}h</div>
            <div className="text-xs text-gray-600">Non-driving work</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="font-semibold text-blue-700">Sleeper</div>
            <div className="text-lg">{dailyLog.sleeper_berth_hours}h</div>
            <div className="text-xs text-gray-600">Required rest</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="font-semibold text-gray-700">Off Duty</div>
            <div className="text-lg">{dailyLog.off_duty_hours}h</div>
            <div className="text-xs text-gray-600">Personal time</div>
          </div>
        </div>

        {/* Entry Details */}
        {dailyLog.entries && dailyLog.entries.length > 0 && (
          <div className="mt-4">
            <h5 className="font-medium mb-2">Detailed Log Entries:</h5>
            <div className="space-y-1 text-xs">
              {dailyLog.entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded"
                >
                  <span className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded ${getDutyStatusColor(
                        entry.duty_status
                      )} mr-2`}
                    />
                    {entry.duty_status_display ||
                      entry.duty_status.replace("_", " ")}
                  </span>
                  <span className="text-gray-600">
                    {formatTime(entry.start_hour)} -{" "}
                    {formatTime(entry.end_hour)} at {entry.location}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const isFormValid =
    formData.current_location &&
    formData.pickup_location &&
    formData.dropoff_location;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <Truck className="inline-block mr-3 text-blue-600" />
            HOS ELD Trip Planner
          </h1>
          <p className="text-gray-600 text-lg">
            Generate FMCSA-compliant route instructions and Electronic Logging
            Device daily logs
          </p>
        </header>

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Enter Trip Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline-block w-4 h-4 mr-1" />
                Current Location
              </label>
              <input
                type="text"
                name="current_location"
                value={formData.current_location}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g., Chicago, IL"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Route className="inline-block w-4 h-4 mr-1" />
                Pickup Location
              </label>
              <input
                type="text"
                name="pickup_location"
                value={formData.pickup_location}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g., Detroit, MI"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline-block w-4 h-4 mr-1" />
                Dropoff Location
              </label>
              <input
                type="text"
                name="dropoff_location"
                value={formData.dropoff_location}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g., Denver, CO"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline-block w-4 h-4 mr-1" />
                Current Cycle Used (Hours)
              </label>
              <input
                type="number"
                name="current_cycle_used"
                value={formData.current_cycle_used}
                onChange={handleInputChange}
                min="0"
                max="70"
                step="0.1"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="0.0"
              />
              <div className="text-xs text-gray-500 mt-1">
                Hours already used in current 8-day cycle (max 70)
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                onClick={handleSubmit}
                disabled={loading || !isFormValid}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Calculating Route & ELD Logs...
                  </span>
                ) : (
                  "Generate Route & ELD Logs"
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Results */}
        {tripResult && (
          <div className="space-y-8">
            {/* Route Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Route className="mr-2 text-blue-600" />
                Route Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Route className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-700">
                    {tripResult.total_distance}
                  </div>
                  <div className="text-sm text-gray-600">Miles</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-700">
                    {tripResult.total_duration}h
                  </div>
                  <div className="text-sm text-gray-600">Driving Time</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Fuel className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                  <div className="text-2xl font-bold text-yellow-700">
                    {tripResult.fuel_stops}
                  </div>
                  <div className="text-sm text-gray-600">Fuel Stops</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-700">
                    {tripResult.required_rest_stops}
                  </div>
                  <div className="text-sm text-gray-600">Rest Periods</div>
                </div>
              </div>

              {/* Route Path */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Trip Route:</h3>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {tripResult.current_location}
                  </span>
                  <span>→</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                    {tripResult.pickup_location}
                  </span>
                  <span>→</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                    {tripResult.dropoff_location}
                  </span>
                </div>
              </div>
            </div>

            {/* Trip Segments */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-6">
                Trip Segments & Schedule
              </h2>
              <div className="space-y-3">
                {tripResult.segments &&
                  tripResult.segments.map((segment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full text-sm font-bold">
                          {segment.sequence_number}
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full ${getSegmentTypeColor(
                            segment.segment_type
                          )}`}
                        />
                        <div>
                          <div className="font-medium">
                            {segment.segment_type_display ||
                              segment.segment_type}
                          </div>
                          <div className="text-sm text-gray-600">
                            {segment.location}
                          </div>
                          {segment.formatted_start_time && (
                            <div className="text-xs text-gray-500">
                              {segment.formatted_start_time} -{" "}
                              {segment.formatted_end_time}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {segment.duration_hours}h
                        </div>
                        {segment.distance_miles > 0 && (
                          <div className="text-sm text-gray-600">
                            {segment.distance_miles} mi
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Daily ELD Logs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <FileText className="mr-2 text-green-600" />
                Electronic Logging Device (ELD) Daily Logs
              </h2>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>FMCSA Compliance:</strong> These logs meet federal
                  Hours of Service regulations (49 CFR Part 395) for
                  property-carrying commercial motor vehicles. Each day shows
                  duty status changes and ensures compliance with 11-hour
                  driving limit, 14-hour on-duty window, and required rest
                  periods.
                </p>
              </div>
              {tripResult.daily_logs &&
                tripResult.daily_logs.map((dailyLog, index) => (
                  <div key={index}>{renderELDGrid(dailyLog)}</div>
                ))}
            </div>

            {/* Map Placeholder */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <MapPin className="mr-2 text-red-600" />
                Route Map
              </h2>
              <div className="h-96 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-600">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                  <p className="text-xl font-semibold mb-2">
                    Interactive Map Integration
                  </p>
                  <p className="text-sm mb-4">
                    Ready for Google Maps, MapBox, or OpenStreetMap API
                  </p>
                  <div className="bg-white p-4 rounded-lg shadow-sm max-w-md mx-auto">
                    <div className="text-sm space-y-1">
                      <p>
                        <strong>Origin:</strong> {tripResult.current_location}
                      </p>
                      <p>
                        <strong>Pickup:</strong> {tripResult.pickup_location}
                      </p>
                      <p>
                        <strong>Destination:</strong>{" "}
                        {tripResult.dropoff_location}
                      </p>
                      <p>
                        <strong>Total Distance:</strong>{" "}
                        {tripResult.total_distance} miles
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Integration Instructions */}
              {/* Real Map Integration */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <MapPin className="mr-2 text-red-600" />
                  Route Map
                </h2>

                <MapComponent
                  segments={tripResult.segments}
                  currentLocation={tripResult.current_location}
                  pickupLocation={tripResult.pickup_location}
                  dropoffLocation={tripResult.dropoff_location}
                />

                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Map Legend
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-gray-500 mr-2"></div>
                      <span>Current Location</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                      <span>Pickup</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-green-600 mr-2"></div>
                      <span>Dropoff</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                      <span>Fuel Stop</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-purple-500 mr-2"></div>
                      <span>Rest Break</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                      <span>Sleeper Berth</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
