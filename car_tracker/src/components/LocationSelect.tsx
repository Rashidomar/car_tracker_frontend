// components/LocationSelect.tsx
import { useState, useEffect, useRef } from "react";
import { Combobox } from "@headlessui/react";
import { MapPin, Loader2, Check } from "lucide-react";

interface Location {
  id: string;
  name: string;
  coords: [number, number]; // [lng, lat]
  locality?: string;
  region?: string;
  country?: string;
}

interface LocationSelectProps {
  label: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function LocationSelect({
  label,
  value,
  onChange,
  placeholder = "Start typing a city...",
  required = true,
  className = "",
}: LocationSelectProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search through backend
  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      setError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the Django geocoding autocomplete endpoint
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/geocode/autocomplete/?q=${encodeURIComponent(
            query
          )}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();

        // Handle API errors
        if (data.error) {
          setError(data.error);
          setResults([]);
          return;
        }

        if (!data.features || data.features.length === 0) {
          setResults([]);
          setError("No locations found. Try a different search.");
          return;
        }

        // Transform API response to Location objects
        const suggestions: Location[] = data.features.map((feature: any) => {
          const props = feature.properties;
          return {
            id: feature.id || props.id || Math.random().toString(),
            name: getDisplayName(props),
            coords: feature.geometry.coordinates, // [lng, lat]
            locality: props.locality,
            region: props.region,
            country: props.country || "US",
          };
        });

        setResults(suggestions);
      } catch (err) {
        console.error("Geocoding error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch locations";
        setError(`Search error: ${errorMessage}`);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500); // Increased debounce for better UX

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const getDisplayName = (properties: any): string => {
    // Handle different API response formats
    if (properties.label) {
      return properties.label;
    }

    if (properties.locality && properties.region) {
      return `${properties.locality}, ${properties.region}`;
    }

    if (properties.name && properties.region) {
      return `${properties.name}, ${properties.region}`;
    }

    if (properties.name) {
      return properties.name;
    }

    return "Unknown location";
  };

  const handleLocationChange = (location: Location | null) => {
    setResults([]);
    setError(null);

    // Update query to show selected location
    if (location) {
      setQuery(location.name);
    } else {
      setQuery("");
    }

    onChange(location);
  };

  const clearSelection = () => {
    handleLocationChange(null);
    setQuery("");
  };

  const handleInputChange = (inputValue: string) => {
    setQuery(inputValue);
    setError(null);

    // Clear selection if input doesn't match current selection
    if (inputValue && value?.name && inputValue !== value.name) {
      onChange(null);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <MapPin className="inline-block w-4 h-4 mr-1" />
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <Combobox value={value} onChange={handleLocationChange} nullable>
        {({ open }) => (
          <>
            <div className="relative">
              <Combobox.Input
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
                onChange={(e) => handleInputChange(e.target.value)}
                displayValue={(location: Location | null) => {
                  // Show current query when typing, selected name when selected
                  if (query && !value) return query;
                  return location?.name || "";
                }}
                placeholder={placeholder}
                required={required}
                autoComplete="off"
              />

              {/* Loading indicator */}
              {loading && (
                <div className="absolute right-10 top-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              )}

              {/* Clear button */}
              {(value || query) && !loading && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors text-lg font-bold"
                  aria-label="Clear selection"
                >
                  ×
                </button>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
                <span className="font-medium">⚠️ {error}</span>
                <div className="text-xs mt-1">
                  Try searching for a major city or use format like "City,
                  State"
                </div>
              </div>
            )}

            {/* Success indicator for selected location */}
            {value && !error && (
              <div className="mt-1 text-sm text-green-600 bg-green-50 border border-green-200 p-2 rounded flex items-center">
                <Check className="h-4 w-4 mr-1" />
                <span>Selected: {value.name}</span>
                {value.coords && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({value.coords[1].toFixed(4)}, {value.coords[0].toFixed(4)})
                  </span>
                )}
              </div>
            )}

            {/* Suggestions dropdown */}
            {open && (results.length > 0 || loading) && (
              <Combobox.Options
                static
                className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border"
              >
                {loading && query ? (
                  <div className="relative cursor-default select-none px-4 py-3 text-gray-500">
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Searching for "{query}"...</span>
                    </div>
                  </div>
                ) : results.length === 0 && query.length >= 3 ? (
                  <div className="relative cursor-default select-none px-4 py-3 text-gray-500">
                    <div className="text-sm">
                      <div className="font-medium">No locations found</div>
                      <div className="text-xs mt-1">
                        Try searching for a major city or check spelling
                      </div>
                    </div>
                  </div>
                ) : (
                  results.map((location, index) => (
                    <Combobox.Option
                      key={location.id || index}
                      value={location}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-3 pl-10 pr-4 ${
                          active ? "bg-blue-600 text-white" : "text-gray-900"
                        }`
                      }
                    >
                      {({ active, selected }) => (
                        <>
                          <div className="flex flex-col">
                            <span
                              className={`block truncate ${
                                selected ? "font-semibold" : "font-normal"
                              }`}
                            >
                              {location.name}
                            </span>
                            {location.coords && (
                              <span
                                className={`text-xs ${
                                  active ? "text-blue-200" : "text-gray-500"
                                }`}
                              >
                                {location.coords[1].toFixed(4)},{" "}
                                {location.coords[0].toFixed(4)}
                              </span>
                            )}
                          </div>

                          {selected && (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? "text-white" : "text-blue-600"
                              }`}
                            >
                              <Check className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            )}
          </>
        )}
      </Combobox>
    </div>
  );
}
