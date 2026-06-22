/// <reference types="vite/client" />

import "leaflet";

declare module "leaflet" {
  interface HeatLatLngTuple extends Array<number> {
    0: number;
    1: number;
    2?: number;
  }
  function heatLayer(latlngs: HeatLatLngTuple[], options?: HeatOptions): HeatLayer;
  class HeatLayer extends Layer {
    constructor(latlngs: HeatLatLngTuple[], options?: HeatOptions);
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    setOptions(options: HeatOptions): this;
    addLatLng(latlng: HeatLatLngTuple | [number, number]): this;
  }
}

declare module "*.css" {
  const content: string;
  export default content;
}
