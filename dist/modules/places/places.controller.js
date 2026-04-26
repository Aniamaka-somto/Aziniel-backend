"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaceDetails = exports.searchPlaces = void 0;
const response_1 = require("../../utils/response");
const searchPlaces = async (req, res) => {
    const { query, lat, lng } = req.query;
    if (!query)
        return (0, response_1.sendError)(res, "Query is required", 400);
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        return (0, response_1.sendSuccess)(res, getMockPlaces(query), "Places fetched (mock)");
    }
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&components=country:ng${lat && lng ? `&location=${lat},${lng}&radius=50000` : ""}`;
    const response = await fetch(url);
    const data = (await response.json());
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return (0, response_1.sendError)(res, "Places API error", 500);
    }
    const places = (data.predictions || []).map((p) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text,
        secondaryText: p.structured_formatting?.secondary_text,
    }));
    (0, response_1.sendSuccess)(res, places, "Places fetched");
};
exports.searchPlaces = searchPlaces;
const getPlaceDetails = async (req, res) => {
    const raw = req.params.placeId;
    const placeId = Array.isArray(raw) ? raw[0] : raw;
    if (!placeId)
        return (0, response_1.sendError)(res, "Place id is required", 400);
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        return (0, response_1.sendSuccess)(res, {
            lat: 4.8156,
            lng: 7.0498,
            address: "Mock location, Port Harcourt",
        }, "Place details (mock)");
    }
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address,name&key=${apiKey}`;
    const response = await fetch(url);
    const data = (await response.json());
    if (data.status !== "OK")
        return (0, response_1.sendError)(res, "Could not get place details", 500);
    const result = data.result;
    (0, response_1.sendSuccess)(res, {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        address: result.formatted_address,
        name: result.name,
    }, "Place details fetched");
};
exports.getPlaceDetails = getPlaceDetails;
const getMockPlaces = (query) => [
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
