
import { CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, SavedTrip } from '../types';

// Returns empty arrays to ensure no fake data is generated.
// The user requested to remove all non-manually entered data.
export const generateSeedData = () => {
  const cars: CarCostEntry[] = [];
  const cities: PoiCity[] = [];
  const spots: PoiSpot[] = [];
  const hotels: PoiHotel[] = [];
  const activities: PoiActivity[] = [];

  return { cars, cities, spots, hotels, activities };
};

export const generateSeedTrips = (
    poiData: { cars: CarCostEntry[], cities: PoiCity[], spots: PoiSpot[], hotels: PoiHotel[], activities: PoiActivity[] }
): SavedTrip[] => {
    return [];
};
