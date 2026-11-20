import type { Area, Country } from '@/types'

export const countries: Country[] = [
  { id: 1, code: 'AU', name: 'Australia' },
  { id: 2, code: 'CA', name: 'Canada' },
  { id: 3, code: 'FR', name: 'France' },
  { id: 4, code: 'DE', name: 'Germany' },
  { id: 5, code: 'IN', name: 'India' },
  { id: 6, code: 'IE', name: 'Ireland' },
  { id: 7, code: 'MY', name: 'Malaysia' },
  { id: 8, code: 'MM', name: 'Myanmar' },
  { id: 9, code: 'SG', name: 'Singapore' },
  { id: 10, code: 'TH', name: 'Thailand' },
  { id: 11, code: 'GB', name: 'United Kingdom' },
  { id: 12, code: 'US', name: 'United States' },
]

const country = (code: string) => countries.find((c) => c.code === code)?.name ?? code

function area(id: number, name: string, code: string, latitude: number, longitude: number): Area {
  return { id, name, country_code: code, country_name: country(code), latitude, longitude }
}

// The six seeded areas (DemoDataSeeder).
export const areas = {
  camden: area(1, 'Camden', 'GB', 51.539, -0.1426),
  hackney: area(2, 'Hackney', 'GB', 51.545, -0.0553),
  tampines: area(3, 'Tampines', 'SG', 1.3496, 103.9568),
  bedok: area(4, 'Bedok', 'SG', 1.3236, 103.9273),
  bahan: area(5, 'Bahan', 'MM', 16.8137, 96.1561),
  sanchaung: area(6, 'Sanchaung', 'MM', 16.804, 96.131),
}

// Extra names the area autocomplete can suggest (stand-in for Nominatim results).
export const areaSuggestions: Area[] = [
  ...Object.values(areas),
  area(101, 'Islington', 'GB', 51.538, -0.1028),
  area(102, 'Hampstead', 'GB', 51.556, -0.178),
  area(103, 'Hammersmith', 'GB', 51.4927, -0.2339),
  area(104, 'Haringey', 'GB', 51.5906, -0.111),
  area(105, 'Tampines West', 'SG', 1.3455, 103.938),
  area(106, 'Toa Payoh', 'SG', 1.3343, 103.8563),
  area(107, 'Bedok North', 'SG', 1.3331, 103.9312),
  area(108, 'Bishan', 'SG', 1.3526, 103.8352),
  area(109, 'Kamayut', 'MM', 16.8259, 96.1281),
  area(110, 'Bahan Township', 'MM', 16.8137, 96.1561),
  area(111, 'Sanchaung Township', 'MM', 16.804, 96.131),
  area(112, 'Burnaby', 'CA', 49.2488, -122.9805),
]
