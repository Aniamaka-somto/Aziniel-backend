import { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/response";

// ─────────────────────────────────────────────
// PHOTON — fuzzy autocomplete (Elasticsearch + OSM)
// Works from 2-3 chars, no key needed
// ─────────────────────────────────────────────

const PHOTON_BASE = "https://photon.komoot.io";

interface PhotonFeature {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  properties: {
    osm_id: number;
    osm_type: string; // N, W, R
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    district?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

function photonMainText(p: PhotonFeature["properties"]): string {
  if (p.name) return p.name;
  if (p.street && p.housenumber) return `${p.housenumber} ${p.street}`;
  if (p.street) return p.street;
  return p.city ?? p.district ?? p.state ?? "Unknown";
}

function photonSecondaryText(p: PhotonFeature["properties"]): string {
  const parts = [p.city ?? p.district, p.state].filter(Boolean);
  return parts.join(", ");
}

function photonDisplayName(p: PhotonFeature["properties"]): string {
  const parts = [p.name, p.street, p.city ?? p.district, p.state].filter(
    Boolean,
  );
  return parts.join(", ");
}

async function photonSearch(
  query: string,
  lat?: number,
  lng?: number,
  limit = 6,
): Promise<PhotonFeature[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    lang: "en",
  });

  // Location bias: Photon weights results near these coords
  if (lat && lng) {
    params.append("lat", String(lat));
    params.append("lon", String(lng));
  } else {
    // Default bias to Nigeria center
    params.append("lat", "9.082");
    params.append("lon", "8.6753");
  }

  const res = await fetch(`${PHOTON_BASE}/api?${params.toString()}`, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`Photon search failed: ${res.status}`);
  const data = (await res.json()) as PhotonResponse;

  // Filter to Nigeria only (Photon has no countrycode param)
  return data.features.filter(
    (f) => !f.properties.country || f.properties.country === "Nigeria",
  );
}

// ─────────────────────────────────────────────
// NOMINATIM — coordinate lookup only
// ─────────────────────────────────────────────

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const NOMINATIM_HEADERS = {
  "User-Agent": "AzinelLogisticsApp/1.0 (contact@azinel.com)",
  "Accept-Language": "en",
};

interface NominatimResult {
  place_id: number;
  osm_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    state?: string;
    road?: string;
    suburb?: string;
  };
}

function nominatimMainText(result: NominatimResult): string {
  if (result.name) return result.name;
  const addr = result.address;
  if (addr?.road && addr?.suburb) return `${addr.road}, ${addr.suburb}`;
  if (addr?.road) return addr.road;
  return result.display_name.split(",")[0].trim();
}

async function nominatimLookup(
  osmType: string,
  osmId: number,
): Promise<NominatimResult> {
  const params = new URLSearchParams({
    osm_ids: `${osmType}${osmId}`,
    format: "json",
    addressdetails: "1",
  });
  const res = await fetch(`${NOMINATIM_BASE}/lookup?${params.toString()}`, {
    headers: NOMINATIM_HEADERS,
  });
  if (!res.ok) throw new Error(`Nominatim lookup failed: ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  if (data.length > 0) return data[0];
  throw new Error("Place not found");
}

// ─────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────

export const searchPlaces = async (req: Request, res: Response) => {
  const { query, lat, lng, mode } = req.query;

  if (!query || String(query).trim().length < 2) {
    return sendError(res, "Query must be at least 2 characters", 400);
  }

  const userLat = lat ? parseFloat(String(lat)) : undefined;
  const userLng = lng ? parseFloat(String(lng)) : undefined;
  const isIntercity = mode === "intercity";

  // ── Google Places — if key is configured ──
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) {
    try {
      const locationParam =
        userLat && userLng
          ? `&location=${userLat},${userLng}&radius=50000`
          : "";
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        String(query),
      )}&key=${apiKey}&components=country:ng${locationParam}`;

      const response = await fetch(url);
      const data = (await response.json()) as {
        status: string;
        predictions?: Array<{
          place_id: string;
          description: string;
          structured_formatting?: { main_text: string; secondary_text: string };
        }>;
      };

      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        const places = (data.predictions ?? []).map((p) => ({
          placeId: p.place_id,
          description: p.description,
          mainText: p.structured_formatting?.main_text,
          secondaryText: p.structured_formatting?.secondary_text,
        }));
        return sendSuccess(res, places, "Places fetched");
      }
    } catch {
      // fall through to Photon
    }
  }

  // ── Photon fuzzy autocomplete ──
  try {
    const limit = isIntercity ? 8 : 6;

    // Intercity: bias to Nigeria center (not user's local area)
    // so searching "Abuja" from Port Harcourt still works
    const searchLat = isIntercity ? 9.082 : userLat;
    const searchLng = isIntercity ? 8.6753 : userLng;

    const features = await photonSearch(
      String(query),
      searchLat,
      searchLng,
      limit,
    );

    const places = features.map((f) => ({
      // photon_N_12345 encodes osm_type + osm_id for precise lookup later
      placeId: `photon_${f.properties.osm_type}_${f.properties.osm_id}`,
      mainText: photonMainText(f.properties),
      description: photonDisplayName(f.properties),
      secondaryText: photonSecondaryText(f.properties),
      // Photon always returns coords — embed so frontend skips the details call
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }));

    return sendSuccess(res, places, "Places fetched");
  } catch (err) {
    console.error("Photon search error:", err);
    return sendError(res, "Place search failed. Try again.", 500);
  }
};

export const getPlaceDetails = async (req: Request, res: Response) => {
  const raw = req.params.placeId;
  const placeId = Array.isArray(raw) ? raw[0] : raw;
  if (!placeId) return sendError(res, "Place id is required", 400);

  // ── Google Places ──
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (
    apiKey &&
    !placeId.startsWith("photon_") &&
    !placeId.startsWith("nominatim_")
  ) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId,
      )}&fields=geometry,formatted_address,name&key=${apiKey}`;

      const response = await fetch(url);
      const data = (await response.json()) as {
        status: string;
        result?: {
          geometry: { location: { lat: number; lng: number } };
          formatted_address: string;
          name?: string;
        };
      };

      if (data.status === "OK" && data.result) {
        return sendSuccess(
          res,
          {
            lat: data.result.geometry.location.lat,
            lng: data.result.geometry.location.lng,
            address: data.result.formatted_address,
            name: data.result.name,
          },
          "Place details fetched",
        );
      }
    } catch {
      // fall through
    }
  }

  // ── Photon result — use embedded coords via Nominatim lookup ──
  if (placeId.startsWith("photon_")) {
    // Format: photon_N_12345
    const parts = placeId.split("_"); // ["photon", "N", "12345"]
    if (parts.length === 3) {
      const osmType = parts[1];
      const osmId = parseInt(parts[2], 10);
      try {
        const result = await nominatimLookup(osmType, osmId);
        return sendSuccess(
          res,
          {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name,
            name: nominatimMainText(result),
          },
          "Place details fetched",
        );
      } catch (err) {
        console.error("Nominatim lookup error:", err);
        return sendError(res, "Could not get place details", 500);
      }
    }
  }

  return sendError(res, "Unknown place id format", 400);
};
