export const FEMALE_NAMES = [
  'Ada', 'Grace', 'Amara', 'Priya', 'Sofia', 'Mei', 'Fatima', 'Elena', 'Aisha', 'Hannah',
  'Yuki', 'Camila', 'Zara', 'Olivia', 'Ingrid', 'Lucía', 'Noor', 'Chloé', 'Ananya', 'Maya',
] as const

export const MALE_NAMES = [
  'Alan', 'Linus', 'Rahul', 'Mateo', 'Kenji', 'Omar', 'Lukas', 'Daniel', 'Kwame', 'Arjun',
  'Liam', 'Noah', 'Hiroshi', 'Diego', 'Ethan', 'Ivan', 'Tariq', 'Jonas', 'Wei', 'José',
] as const

export const LAST_NAMES = [
  'Lovelace', 'Hopper', 'Turing', 'Nakamura', 'Okafor', 'Sharma', 'García', 'Müller', 'Rossi',
  'Kim', 'Novak', 'Haddad', 'Silva', 'Johansson', "O'Brien", 'Nguyen', 'Kowalski', 'Mensah',
  'Patel', 'Dubois', 'Chen', 'Smith-Jones', 'Andersen', 'Fernández', 'Ivanova', 'Tanaka',
] as const

/** RFC 2606 reserved domains, so generated addresses never reach a real inbox. */
export const SAFE_EMAIL_DOMAINS = [
  'example.com', 'example.org', 'example.net', 'test.example', 'mail.example',
] as const

export const JOB_TITLES = [
  'QA Engineer', 'Software Engineer', 'Product Manager', 'UX Designer', 'Data Analyst',
  'DevOps Engineer', 'Support Specialist', 'Account Executive', 'Marketing Lead', 'CTO',
  'Engineering Manager', 'Security Analyst', 'Technical Writer', 'Scrum Master',
] as const

export const COMPANY_PREFIXES = [
  'Northwind', 'Contoso', 'Initech', 'Globex', 'Umbrella', 'Acme', 'Stark', 'Wayne',
  'Hooli', 'Vandelay', 'Pied Piper', 'Soylent', 'Cyberdyne', 'Tyrell',
] as const

export const COMPANY_SUFFIXES = [
  'Labs', 'Systems', 'Industries', 'Group', 'Technologies', 'Holdings', 'Analytics', 'Works',
] as const

export interface CityInfo {
  city: string
  region: string
  lat: number
  lng: number
  tz: string
}

export interface CountryInfo {
  code: string
  name: string
  postal: string
  phone: string
  streets: readonly string[]
  /** `{n}` is the house number and `{s}` the street name. */
  streetFormat: string
  cities: readonly CityInfo[]
}

export const COUNTRIES: readonly CountryInfo[] = [
  {
    code: 'US',
    name: 'United States',
    postal: '#####',
    phone: '+1 ### ### ####',
    streets: ['Oak Avenue', 'Maple Drive', 'Main Street', 'Cedar Lane', 'Sunset Boulevard'],
    streetFormat: '{n} {s}',
    cities: [
      { city: 'New York', region: 'NY', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
      { city: 'Austin', region: 'TX', lat: 30.2672, lng: -97.7431, tz: 'America/Chicago' },
      { city: 'Seattle', region: 'WA', lat: 47.6062, lng: -122.3321, tz: 'America/Los_Angeles' },
      { city: 'Denver', region: 'CO', lat: 39.7392, lng: -104.9903, tz: 'America/Denver' },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    postal: 'AA# #AA',
    phone: '+44 7### ######',
    streets: ['High Street', 'Station Road', 'Church Lane', 'Victoria Road', 'Kings Road'],
    streetFormat: '{n} {s}',
    cities: [
      { city: 'London', region: 'England', lat: 51.5072, lng: -0.1276, tz: 'Europe/London' },
      { city: 'Manchester', region: 'England', lat: 53.4808, lng: -2.2426, tz: 'Europe/London' },
      { city: 'Edinburgh', region: 'Scotland', lat: 55.9533, lng: -3.1883, tz: 'Europe/London' },
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    postal: '#####',
    phone: '+49 15# #######',
    streets: ['Hauptstraße', 'Lindenallee', 'Bahnhofstraße', 'Gartenweg', 'Schillerstraße'],
    streetFormat: '{s} {n}',
    cities: [
      { city: 'Berlin', region: 'Berlin', lat: 52.52, lng: 13.405, tz: 'Europe/Berlin' },
      { city: 'München', region: 'Bayern', lat: 48.1351, lng: 11.582, tz: 'Europe/Berlin' },
      { city: 'Hamburg', region: 'Hamburg', lat: 53.5511, lng: 9.9937, tz: 'Europe/Berlin' },
    ],
  },
  {
    code: 'IN',
    name: 'India',
    postal: '######',
    phone: '+91 9#### #####',
    streets: ['MG Road', 'Residency Road', 'Brigade Road', 'Linking Road', 'Park Street'],
    streetFormat: '{n}, {s}',
    cities: [
      { city: 'Bengaluru', region: 'Karnataka', lat: 12.9716, lng: 77.5946, tz: 'Asia/Kolkata' },
      { city: 'Mumbai', region: 'Maharashtra', lat: 19.076, lng: 72.8777, tz: 'Asia/Kolkata' },
      { city: 'Hyderabad', region: 'Telangana', lat: 17.385, lng: 78.4867, tz: 'Asia/Kolkata' },
    ],
  },
  {
    code: 'FR',
    name: 'France',
    postal: '#####',
    phone: '+33 6 ## ## ## ##',
    streets: ['rue de la Paix', 'avenue Victor Hugo', 'rue du Moulin', 'boulevard Voltaire'],
    streetFormat: '{n} {s}',
    cities: [
      { city: 'Paris', region: 'Île-de-France', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
      { city: 'Lyon', region: 'Auvergne-Rhône-Alpes', lat: 45.764, lng: 4.8357, tz: 'Europe/Paris' },
    ],
  },
  {
    code: 'JP',
    name: 'Japan',
    postal: '###-####',
    phone: '+81 90-####-####',
    streets: ['Chuo-dori', 'Meiji-dori', 'Omotesando', 'Sakura-dori'],
    streetFormat: '{n} {s}',
    cities: [
      { city: 'Tokyo', region: 'Tokyo', lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
      { city: 'Osaka', region: 'Osaka', lat: 34.6937, lng: 135.5023, tz: 'Asia/Tokyo' },
    ],
  },
  {
    code: 'BR',
    name: 'Brazil',
    postal: '#####-###',
    phone: '+55 11 9####-####',
    streets: ['Avenida Paulista', 'Rua Augusta', 'Rua das Flores', 'Avenida Atlântica'],
    streetFormat: '{s}, {n}',
    cities: [
      { city: 'São Paulo', region: 'SP', lat: -23.5505, lng: -46.6333, tz: 'America/Sao_Paulo' },
      { city: 'Rio de Janeiro', region: 'RJ', lat: -22.9068, lng: -43.1729, tz: 'America/Sao_Paulo' },
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    postal: '####',
    phone: '+61 4## ### ###',
    streets: ['George Street', 'Collins Street', 'Beach Road', 'Queen Street'],
    streetFormat: '{n} {s}',
    cities: [
      { city: 'Sydney', region: 'NSW', lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' },
      { city: 'Melbourne', region: 'VIC', lat: -37.8136, lng: 144.9631, tz: 'Australia/Melbourne' },
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    postal: 'A#A #A#',
    phone: '+1 ### ### ####',
    streets: ['Yonge Street', 'Robson Street', 'Maple Crescent', 'Elm Street'],
    streetFormat: '{n} {s}',
    cities: [
      { city: 'Toronto', region: 'ON', lat: 43.6532, lng: -79.3832, tz: 'America/Toronto' },
      { city: 'Vancouver', region: 'BC', lat: 49.2827, lng: -123.1207, tz: 'America/Vancouver' },
    ],
  },
]

export const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim',
  'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip',
  'commodo', 'consequat', 'duis', 'aute', 'irure', 'voluptate', 'velit', 'esse', 'cillum',
] as const

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
] as const

export const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' },
  { code: 'JPY', symbol: '¥' },
  { code: 'BRL', symbol: 'R$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
] as const

export const MIME_TYPES = [
  'application/json', 'text/html', 'text/csv', 'image/png', 'image/jpeg', 'application/pdf',
  'application/xml', 'video/mp4', 'application/zip', 'text/plain',
] as const

export const FILE_EXTENSIONS = ['pdf', 'png', 'csv', 'docx', 'json', 'zip', 'jpg', 'txt', 'xlsx'] as const

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export const HTTP_STATUSES = [200, 201, 204, 301, 304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503] as const

export const STATUSES = ['active', 'inactive', 'pending', 'suspended', 'archived'] as const

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
