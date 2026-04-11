import { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/response";

export const searchPlaces = async (req: Request, res: Response) => {
  const { query, lat, lng } = req.query;

  if (!query) return sendError(res, "Query is required", 400);

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return sendSuccess(
      res,
      getMockPlaces(query as string),
      "Places fetched (mock)",
    );
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    query as string,
  )}&key=${apiKey}&components=country:ng${
    lat && lng ? `&location=${lat},${lng}&radius=50000` : ""
  }`;

  const response = await fetch(url);
  const data = (await response.json()) as {
    status: string;
    predictions?: Array<{
      place_id: string;
      description: string;
      structured_formatting?: {
        main_text: string;
        secondary_text: string;
      };
    }>;
  };

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return sendError(res, "Places API error", 500);
  }

  const places = (data.predictions || []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text,
    secondaryText: p.structured_formatting?.secondary_text,
  }));

  sendSuccess(res, places, "Places fetched");
};

export const getPlaceDetails = async (req: Request, res: Response) => {
  const raw = req.params.placeId;
  const placeId = Array.isArray(raw) ? raw[0] : raw;
  if (!placeId) return sendError(res, "Place id is required", 400);
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return sendSuccess(
      res,
      {
        lat: 4.8156,
        lng: 7.0498,
        address: "Mock location, Port Harcourt",
      },
      "Place details (mock)",
    );
  }

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

  if (data.status !== "OK")
    return sendError(res, "Could not get place details", 500);

  const result = data.result!;
  sendSuccess(
    res,
    {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      address: result.formatted_address,
      name: result.name,
    },
    "Place details fetched",
  );
};

const getMockPlaces = (query: string) => [
  {
    placeId: "mock_1",
    description: `${query}, Port Harcourt, Rivers State`,
    mainText: query,
    secondaryText: "Port Harcourt, Rivers State",
  },
  {
    placeId: "mock_2",
    description: `${query} Junction, Rumuola, Port Harcourt`,
    mainText: `${query} Junction`,
    secondaryText: "Rumuola, Port Harcourt",
  },
  {
    placeId: "mock_3",
    description: `${query} Street, GRA Phase 2, Port Harcourt`,
    mainText: `${query} Street`,
    secondaryText: "GRA Phase 2",
  },
];
