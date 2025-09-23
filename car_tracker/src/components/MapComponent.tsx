// components/MapComponent.tsx
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import type { TripSegment } from "../App";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons for different segment types
const createCustomIcon = (color: string) => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const iconColors = {
  driving: "#ef4444", // red-500
  fuel: "#eab308", // yellow-500
  pickup: "#22c55e", // green-500
  dropoff: "#16a34a", // green-600
  sleeper_berth: "#3b82f6", // blue-500
  rest_break: "#a855f7", // purple-500
  default: "#6b7280", // gray-500
};

interface MapComponentProps {
  segments?: TripSegment[];
  currentLocation: string;
  pickupLocation: string;
  dropoffLocation: string;
}

const MapComponent: React.FC<MapComponentProps> = ({
  segments,
  currentLocation,
  pickupLocation,
  dropoffLocation,
}) => {
  // Get real coordinates from backend geocoding
  const [coordinates, setCoordinates] = useState<{
    current: [number, number];
    pickup: [number, number];
    dropoff: [number, number];
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        setLoading(true);

        // Geocode all locations using your backend
        const locations = [currentLocation, pickupLocation, dropoffLocation];
        const coordPromises = locations.map(async (location) => {
          const response = await fetch(
            `/api/geocode/autocomplete/?q=${encodeURIComponent(location)}`
          );
          const data = await response.json();

          if (data.features && data.features.length > 0) {
            const coords = data.features[0].geometry.coordinates;
            return [coords[1], coords[0]] as [number, number]; // Leaflet uses [lat, lng]
          }

          // Fallback to default coordinates if geocoding fails
          return getDefaultCoordinates(location);
        });

        const [currentCoords, pickupCoords, dropoffCoords] = await Promise.all(
          coordPromises
        );

        setCoordinates({
          current: currentCoords,
          pickup: pickupCoords,
          dropoff: dropoffCoords,
        });
      } catch (error) {
        console.error("Error fetching coordinates:", error);

        // Fallback to default coordinates
        setCoordinates({
          current: getDefaultCoordinates(currentLocation),
          pickup: getDefaultCoordinates(pickupLocation),
          dropoff: getDefaultCoordinates(dropoffLocation),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCoordinates();
  }, [currentLocation, pickupLocation, dropoffLocation]);

  // Fallback coordinate calculation (improved version)
  const getDefaultCoordinates = (location: string): [number, number] => {
    const cityCoords: Record<string, [number, number]> = {
      chicago: [41.8781, -87.6298],
      detroit: [42.3314, -83.0458],
      denver: [39.7392, -104.9903],
      "los angeles": [34.0522, -118.2437],
      "new york": [40.7128, -74.006],
      miami: [25.7617, -80.1918],
      houston: [29.7604, -95.3698],
      seattle: [47.6062, -122.3321],
      phoenix: [33.4484, -112.074],
      dallas: [32.7767, -96.797],
    };

    const locationLower = location.toLowerCase();

    for (const [city, coords] of Object.entries(cityCoords)) {
      if (locationLower.includes(city) || city.includes(locationLower)) {
        return coords;
      }
    }

    // Default to center of US
    return [39.8283, -98.5795];
  };

  if (loading) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!coordinates) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Unable to load map coordinates</p>
        </div>
      </div>
    );
  }

  const routePoints: [number, number][] = [
    coordinates.current,
    coordinates.pickup,
    coordinates.dropoff,
  ];

  return (
    <MapContainer
      center={coordinates.current}
      zoom={5}
      style={{ height: "400px", width: "100%" }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Route Polyline */}
      <Polyline
        positions={routePoints}
        color="#3b82f6"
        weight={4}
        opacity={0.7}
      />

      {/* Markers for key points */}
      <Marker
        position={coordinates.current}
        icon={createCustomIcon(iconColors.default)}
      >
        <Popup>
          <div className="text-center">
            <strong>Current Location</strong>
            <br />
            {currentLocation}
          </div>
        </Popup>
      </Marker>

      <Marker
        position={coordinates.pickup}
        icon={createCustomIcon(iconColors.pickup)}
      >
        <Popup>
          <div className="text-center">
            <strong>Pickup Location</strong>
            <br />
            {pickupLocation}
          </div>
        </Popup>
      </Marker>

      <Marker
        position={coordinates.dropoff}
        icon={createCustomIcon(iconColors.dropoff)}
      >
        <Popup>
          <div className="text-center">
            <strong>Dropoff Location</strong>
            <br />
            {dropoffLocation}
          </div>
        </Popup>
      </Marker>

      {/* Markers for segments (fuel stops, rest breaks, etc.) */}
      {segments?.map((segment, index) => {
        if (
          ["fuel", "rest_break", "sleeper_berth"].includes(segment.segment_type)
        ) {
          // For segments, we'll place them along the route
          // This is a simplified approach - in production you'd get exact coordinates
          const progress = (index + 1) / (segments.length + 1);
          const lat =
            coordinates.current[0] +
            (coordinates.dropoff[0] - coordinates.current[0]) * progress;
          const lng =
            coordinates.current[1] +
            (coordinates.dropoff[1] - coordinates.current[1]) * progress;
          const coords: [number, number] = [lat, lng];

          return (
            <Marker
              key={index}
              position={coords}
              icon={createCustomIcon(
                iconColors[segment.segment_type as keyof typeof iconColors] ||
                  iconColors.default
              )}
            >
              <Popup>
                <div className="text-sm">
                  <strong>
                    {segment.segment_type_display || segment.segment_type}
                  </strong>
                  <br />
                  Location: {segment.location}
                  <br />
                  Duration: {segment.duration_hours}h<br />
                  {segment.formatted_start_time && (
                    <>
                      Time: {segment.formatted_start_time} -{" "}
                      {segment.formatted_end_time}
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        }
        return null;
      })}
    </MapContainer>
  );
};

export default MapComponent;
