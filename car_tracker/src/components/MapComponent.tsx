import "leaflet/dist/leaflet.css";
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
delete (L.Icon.Default.prototype as unknown)._getIconUrl;
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
  // This would normally come from your API/geocoding service
  // For now, we'll use placeholder coordinates
  const getCoordinatesForLocation = (location: string): [number, number] => {
    // Simple hash function to generate consistent coordinates for demo
    const hash = location.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    // Generate coordinates within US bounds for demo
    const lat = 39.8283 + (hash % 100) / 1000 - 0.05;
    const lng = -98.5795 + (hash % 100) / 1000 - 0.05;
    return [lat, lng];
  };

  const currentCoords = getCoordinatesForLocation(currentLocation);
  const pickupCoords = getCoordinatesForLocation(pickupLocation);
  const dropoffCoords = getCoordinatesForLocation(dropoffLocation);

  const routePoints: [number, number][] = [
    currentCoords,
    pickupCoords,
    dropoffCoords,
  ];

  return (
    <MapContainer
      center={currentCoords}
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
        position={currentCoords}
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
        position={pickupCoords}
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
        position={dropoffCoords}
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
          const coords = getCoordinatesForLocation(segment.location);
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
