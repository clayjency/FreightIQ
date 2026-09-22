import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loader2 } from 'lucide-react';

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteMapProps {
  origin: string;
  destination: string;
}

interface Coords {
  lat: number;
  lon: number;
  displayName: string;
}

// A sub-component to automatically adjust the map bounds to fit the markers
const FitBounds: React.FC<{ originCoords: Coords | null; destCoords: Coords | null }> = ({
  originCoords,
  destCoords,
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (originCoords && destCoords) {
      const bounds = L.latLngBounds(
        [originCoords.lat, originCoords.lon],
        [destCoords.lat, destCoords.lon]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (originCoords) {
      map.setView([originCoords.lat, originCoords.lon], 5);
    }
  }, [originCoords, destCoords, map]);

  return null;
};

export const RouteMap: React.FC<RouteMapProps> = ({ origin, destination }) => {
  const [originCoords, setOriginCoords] = useState<Coords | null>(null);
  const [destCoords, setDestCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoordinates = async (portName: string): Promise<Coords | null> => {
      try {
        // Strip out parenthetical info like "(IN)" or "Rotterdam"
        const cleanName = portName.split('(')[0].trim();
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            cleanName + ' port'
          )}&limit=1`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
            displayName: portName,
          };
        }
        return null;
      } catch (err) {
        console.error(`Error fetching coordinates for ${portName}:`, err);
        return null;
      }
    };

    const getRouteData = async () => {
      setLoading(true);
      setError(null);
      
      const [originData, destData] = await Promise.all([
        fetchCoordinates(origin),
        fetchCoordinates(destination),
      ]);

      if (!originData && !destData) {
        setError('Could not locate ports on the map.');
      } else {
        setOriginCoords(originData);
        setDestCoords(destData);
      }
      
      setLoading(false);
    };

    if (origin && destination) {
      getRouteData();
    }
  }, [origin, destination]);

  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-900 rounded-xl border border-gray-800 flex items-center justify-center flex-col gap-3 mt-6">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        <p className="text-sm text-gray-400">Locating ports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-64 bg-gray-900 rounded-xl border border-gray-800 flex items-center justify-center mt-6 p-4 text-center">
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden border border-gray-800 mt-6 relative z-0">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {originCoords && (
          <Marker position={[originCoords.lat, originCoords.lon]}>
            <Popup>
              <span className="font-semibold text-gray-900">Origin: {originCoords.displayName}</span>
            </Popup>
          </Marker>
        )}
        
        {destCoords && (
          <Marker position={[destCoords.lat, destCoords.lon]}>
            <Popup>
              <span className="font-semibold text-gray-900">Destination: {destCoords.displayName}</span>
            </Popup>
          </Marker>
        )}

        {originCoords && destCoords && (
          <Polyline
            positions={[
              [originCoords.lat, originCoords.lon],
              [destCoords.lat, destCoords.lon],
            ]}
            pathOptions={{ color: '#818cf8', weight: 3, dashArray: '5, 10' }}
          />
        )}
        
        <FitBounds originCoords={originCoords} destCoords={destCoords} />
      </MapContainer>
    </div>
  );
};
