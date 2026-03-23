/** Mock listings for B2B Nutzfahrzeug-Portal (replace with API later). */

export type TruckListing = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  previousPrice?: number;
  daysListed: number;
  mileageKm: number;
  year: number;
  powerKw: number;
  location: string;
  fuel: "Diesel" | "Elektro" | "CNG";
  gearbox: "Automatik" | "Schaltgetriebe";
  highlights: string[];
  badges: ("spot" | "reduced" | "new" | "auction")[];
  imageTone: "slate" | "blue" | "zinc" | "stone";
  currentBid?: number;
  bidCount: number;
  auctionEndsAt?: string;
};

export const MOCK_LISTINGS: TruckListing[] = [
  {
    id: "1",
    title: "Mercedes-Benz Actros 1853 LS",
    subtitle: "Megaspace · Retarder · Vollausstattung",
    price: 78900,
    previousPrice: 84900,
    daysListed: 72,
    mileageKm: 412000,
    year: 2019,
    powerKw: 390,
    location: "Hamburg",
    fuel: "Diesel",
    gearbox: "Automatik",
    highlights: ["EURO 6", "Klima", "Navi", "2 Betten"],
    badges: ["reduced", "spot"],
    imageTone: "slate",
    currentBid: 76500,
    bidCount: 6,
    auctionEndsAt: "2025-03-22T18:00:00",
  },
  {
    id: "2",
    title: "MAN TGX 18.510 4x2",
    subtitle: "GX-Kabine · Intarder · Standklima",
    price: 92500,
    daysListed: 34,
    mileageKm: 298000,
    year: 2021,
    powerKw: 375,
    location: "Berlin",
    fuel: "Diesel",
    gearbox: "Automatik",
    highlights: ["EURO 6", "ACC", "LED", "Tank 1200l"],
    badges: ["new"],
    imageTone: "blue",
    bidCount: 0,
  },
  {
    id: "3",
    title: "Scania R 500 A6x2/4",
    subtitle: "Highline · Opticruise · Hydraulik",
    price: 112000,
    previousPrice: 118500,
    daysListed: 95,
    mileageKm: 356000,
    year: 2020,
    powerKw: 368,
    location: "München",
    fuel: "Diesel",
    gearbox: "Automatik",
    highlights: ["EURO 6", "Retarder", "Kühlschrank"],
    badges: ["reduced", "auction"],
    imageTone: "zinc",
    currentBid: 108000,
    bidCount: 11,
    auctionEndsAt: "2025-03-25T12:00:00",
  },
  {
    id: "4",
    title: "Volvo FH 460 Globetrotter",
    subtitle: "I-Shift · VEB+ · Vollspoiler",
    price: 67800,
    daysListed: 12,
    mileageKm: 520000,
    year: 2018,
    powerKw: 338,
    location: "Köln",
    fuel: "Diesel",
    gearbox: "Automatik",
    highlights: ["EURO 6", "2 Tanks", "Sitzheizung"],
    badges: ["spot"],
    imageTone: "stone",
    bidCount: 2,
  },
  {
    id: "5",
    title: "DAF XF 480 FT Super Space",
    subtitle: "TraXon · Predictive Cruise",
    price: 88900,
    daysListed: 58,
    mileageKm: 380000,
    year: 2020,
    powerKw: 353,
    location: "Dortmund",
    fuel: "Diesel",
    gearbox: "Automatik",
    highlights: ["EURO 6", "Navi", "Klima"],
    badges: ["new"],
    imageTone: "slate",
    currentBid: 86000,
    bidCount: 4,
    auctionEndsAt: "2025-03-21T10:00:00",
  },
  {
    id: "6",
    title: "Iveco S-Way AS440S48T/P",
    subtitle: "Hi-Way Kabine · ZF AS-Tronic",
    price: 71500,
    previousPrice: 76900,
    daysListed: 88,
    mileageKm: 445000,
    year: 2019,
    powerKw: 353,
    location: "Frankfurt",
    fuel: "Diesel",
    gearbox: "Automatik",
    highlights: ["EURO 6", "Retarder"],
    badges: ["reduced"],
    imageTone: "blue",
    bidCount: 0,
  },
];

export function formatEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}
