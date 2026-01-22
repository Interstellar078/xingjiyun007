
export enum TransportType {
  Plane = '飞机',
  PrivateCar = '包车',
  Intercity = '城际',
  Carpool = '拼车',
  Pickup = '接机',
  Dropoff = '送机',
  Train = '火车',
  Ship = '轮船',
  Other = '其它'
}

export interface CostItem {
  id: string;
  name: string;
  value: number;
}

export interface DayRow {
  id: string;
  dayIndex: number; // 1-based
  date: string; // YYYY-MM-DD
  route: string; // New: Replaces origin/destination. Format: A-B-C
  transport: string[]; // Multi-select
  carModel?: string; // Selected Car Model from DB
  hotelName: string;
  hotelRoomType: string; // New: Selected Room Type
  ticketName: string[]; // Multi-select Spot Names
  activityName: string[]; // Multi-select Activity Names
  description: string; // New: Itinerary Details
  rooms: number;
  
  // Costs
  transportCost: number;
  hotelPrice: number; // Unit price
  hotelCost: number; // Calculated: price * rooms
  ticketCost: number; // Calculated: sum(unit_prices) * peopleCount
  activityCost: number; // Calculated: sum(unit_prices) * peopleCount
  otherCost: number;
  
  // Custom dynamic costs
  customCosts: Record<string, number>; // Key is custom column ID
}

export interface CustomColumn {
  id: string;
  name: string;
}

export interface SavedTrip {
  id: string;
  name: string;
  timestamp: number;
  settings: TripSettings;
  rows: DayRow[];
  customColumns: CustomColumn[];
  createdBy?: string; // New: track creator
  lastModifiedBy?: string; // New: track modifier
}

export interface TripSettings {
  plannerName: string;
  customerName: string; // Used for file naming
  peopleCount: number;
  roomCount: number;
  currency: string;
  exchangeRate: number;
  destinations: string[]; // Array of countries/cities
  startDate: string;
  marginPercent: number; // e.g., 20 for 20%
  tipPerDay: number;
  
  // Manual Overrides
  manualTotalPrice?: number;
  manualInclusions?: string;
  manualExclusions?: string; // Added: Cost Exclusions
}

// Resource Database Types
export interface CarCostEntry {
  id: string;
  region: string; // Country or Region name
  carModel: string; // "车型"
  serviceType: string; // "服务" (New: 包车, 城际, 拼车, etc.)
  passengers: number; // "顾客数" (New)
  priceLow: number; // "淡季价格" (New)
  priceHigh: number; // "旺季价格" (New)
}

export interface PoiCity {
  id: string;
  country: string;
  name: string;
}

export interface PoiSpot {
  id: string;
  cityId: string;
  name: string;
  price: number;
}

export interface PoiHotel {
  id: string;
  cityId: string;
  name: string;
  roomType: string;
  price: number;
}

export interface PoiActivity {
  id: string;
  cityId: string;
  name: string;
  price: number;
}

// New: File Storage for Countries
export interface CountryFile {
  id: string;
  country: string;
  name: string;
  type: string; // MIME type
  size: number;
  data: string; // Base64
  uploadDate: number;
}

// --- Auth & Admin Types ---

export type UserRole = 'admin' | 'user';

export interface User {
  username: string;
  password: string; // In a real app, this would be hashed
  role: UserRole;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  username: string;
  action: string; // e.g., "LOGIN", "CREATE_TRIP", "UPDATE_DB"
  details: string;
}
