import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  disabled: boolean;
  onSelect: (latitude: number, longitude: number) => void;
}

function Selection({ latitude, longitude, radius, disabled, onSelect }: Props) {
  const map = useMap();
  useMapEvents({
    click: (event) => {
      if (!disabled)
        onSelect(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
    },
  });
  useEffect(() => {
    if (latitude !== null && longitude !== null) map.panTo([latitude, longitude]);
  }, [latitude, longitude, map]);
  if (latitude === null || longitude === null) return null;
  return (
    <>
      <Circle
        center={[latitude, longitude]}
        radius={radius * 1000}
        pathOptions={{ color: "#1565c0", fillOpacity: 0.12 }}
      />
      <CircleMarker center={[latitude, longitude]} radius={6} pathOptions={{ color: "#1565c0" }} />
    </>
  );
}

export default function ServiceAreaPicker(props: Props) {
  return (
    <MapContainer
      center={[props.latitude ?? -23.5505, props.longitude ?? -46.6333]}
      zoom={11}
      style={{ height: 280, width: "100%", marginBottom: 16 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Selection {...props} />
    </MapContainer>
  );
}
