/**
 * NIDAAMKA QIIMAHA SUUQA MUQDISHO - SOMALI PROFESSIONAL UI
 * 100% Somali Language Implementation
 * 
 * Translated: August 1, 2026
 */

// ============================================
// SYSTEM IDENTITY / AQOONSI NIDAAMKA
// ============================================

export const SYSTEM_NAME = "Mogadishu Market Price System";
export const SYSTEM_SHORT = "MMPS";
export const SYSTEM_NAME_SOMALI = "Nidaamka Qiimaha Suuqa Muqdisho";

// ============================================
// MAIN SECTOR NAMES / QAYBAHA WAXBARASHADA
// ============================================

export const SECTOR_NAMES = {
  livestock: "Xoolaha",      // Livestock
  electricity: "Korontada",   // Electricity
  water: "Biyaha",           // Water
} as const;

export const SYSTEM_SECTORS_TAGLINE = "Xoolaha · Korontada · Biyaha";

// ============================================
// NAVIGATION / KU DHEXGALIN
// ============================================

export const NAV_ITEMS = {
  home: "Hore",
  livestock: "Xoolaha",
  electricity: "Korontada",
  water: "Biyaha",
  reports: "Warbixino",
  admin: "Maamul",
  superAdmin: "Maamul Guud",
  register: "Isdiiwaangeli",
  login: "Soo gal",
  logout: "Ka Bax",
  dashboard: "Dooshka",
} as const;

// ============================================
// AUTHENTICATION / ASTAAN
// ============================================

export const AUTH_LABELS = {
  email: "Emailka",
  password: "Furaha sirta",
  fullName: "Magaca Buuxa",
  signIn: "Soo gal",
  signUp: "Isdiiwaangeli",
  forgotPassword: "Ma illowday furaha sirta?",
  createAccount: "Samee Akoon Cusub",
  alreadyHaveAccount: "Miyaad akoon haysaa?",
  noAccount: "Miyaad akoon lahayn?",
  showPassword: "Tus furaha sirta",
  hidePassword: "Qari furaha sirta",
  signOut: "Ka Bax",
  invalidCredentials: "Emailka ama furaha sirta waa khalad",
  sessionExpired: "Hadda Nabadaabin La'aha",
} as const;

// ============================================
// ROLES / DOOR MATAAL
// ============================================

export const ROLES_SOMALI = {
  superAdmin: "Maamul Guud",
  companyAdmin: "Maamul Shirkadda",
  user: "Isticmaaliyaha",
  guest: "Martida",
} as const;

// ============================================
// COMPANY SECTORS / QAYBAHA SHIRKADDU
// ============================================

export const SECTOR_LABELS = {
  livestock: {
    name: "Xoolaha",
    description: "Suuqa Xoolaha - Geelka, Loda, Arriga",
    fullName: "Suuqa Xoolaha (Livestock Market)",
  },
  electricity: {
    name: "Korontada",
    description: "Suuqa Korontada - Dhismooyinka iyo Guryaha",
    fullName: "Suuqa Korontada (Electricity Market)",
  },
  water: {
    name: "Biyaha",
    description: "Suuqa Biyaha - Guryaha iyo Ganacsiga",
    fullName: "Suuqa Biyaha (Water Supply Market)",
  },
} as const;

// ============================================
// LIVESTOCK TYPES / NOOCYADA XOOLAHA
// ============================================

export const LIVESTOCK_TYPES = {
  geel: { somali: "Geelka", english: "Camels" },
  loda: { somali: "Loda", english: "Cattle" },
  arri: { somali: "Ari & Ido", english: "Sheep & Goats" },
} as const;

export const CAMEL_TYPES = {
  awr: "Awr",      // Adult male camel
  hal: "Hal",      // Adult female camel
  gurbac: "Qurbac",
  qurbac: "Qurbac",
  qaalin: "Qaalin", // Calf
  rati: "Rati",    // Young adult
  baarqab: "Baarqab", // Young female
} as const;

export const CATTLE_TYPES = {
  sac: "Sac",      // Young female
  dibi: "Dibi",    // Young male
  weyl: "Weyl",    // Adult
  qaalin: "Qaalin", // Calf
} as const;

export const SHEEP_GOAT_TYPES = {
  lax: "Lax",      // Ewe (female sheep)
  wan: "Wan",      // Ram (male sheep)
  caysan: "Caysan", // Lamb (young sheep)
  orgi: "Orgi",    // Yearling sheep
  neyl: "Neyl",    // Sheep (general)
  riyo: "Ri",
  wahar: "Waxar",
  sabeen: "Sabeen", // Kid
  suman: "Suman",  // Young adult
} as const;

// ============================================
// COMMON ACTIONS / FICIL CAADI
// ============================================

export const ACTIONS = {
  add: "Roo Daaree",
  edit: "Cusbii Samee",
  delete: "Tir",
  save: "Keydi",
  cancel: "Jooji",
  submit: "Soo Gudbee",
  approve: "Ogolow",
  reject: "Diidda",
  view: "Eeg",
  download: "Soo Dejiye",
  upload: "Kor Jee",
  search: "Raadi",
  filter: "Shali",
  export: "Soo Saari",
  print: "Daabaci",
  refresh: "Cusbii Lood",
  back: "Dib u Cel",
  next: "Soo Socod",
  previous: "Hore",
  close: "Xid",
} as const;

// ============================================
// COMMON MESSAGES / FARIIN CAADI
// ============================================

export const MESSAGES = {
  success: "Guul Galay!",
  error: "Khalad Dhacay",
  warning: "Ogow",
  info: "Macluumaad",
  loading: "Lagu Kariyaa...",
  saving: "Lagu Kaydiyaa...",
  noData: "Xog Lahayn",
  empty: "Banaan",
  required: "Mahadsantahay",
  invalid: "Khaldan",
  confirmed: "Xaqijiyay",
  deleted: "Tirday",
  updated: "Cusbii Loodaysay",
  created: "Abuuray",
} as const;

// ============================================
// FORM FIELDS / ALAAB FOOMKA
// ============================================

export const FORM_LABELS = {
  companyName: "Magaca Shirkadda",
  companyEmail: "Emailka Shirkadda",
  companyPhone: "Lambarka Shirkadda",
  companyAddress: "Cinwaanka Shirkadda",
  companyType: "Nooca Shirkadda",
  sector: "Qaybaha",
  district: "Degmada",
  price: "Qiimaha",
  date: "Taraarikha",
  time: "Waqtiga",
  status: "Xaalada",
  description: "Faarmiska",
  notes: "Tifatiro",
  quantity: "Tirada",
  unit: "Cabirka",
  category: "Qaybta",
  type: "Nooca",
} as const;

// ============================================
// STATUS VALUES / XAALADAHA
// ============================================

export const STATUS_VALUES = {
  pending: "Jidhaafsan",
  approved: "Ogolow",
  rejected: "Diidday",
  active: "Faal",
  inactive: "Faal la'",
  processing: "Lagu Shaqeeyaa",
  completed: "Dhammaatay",
  failed: "Guul ma Galay",
} as const;

// ============================================
// DASHBOARD / DOOSHKA
// ============================================

export const DASHBOARD = {
  title: "Dooshka",
  welcome: "Assalamu Alaikum",
  overview: "Muuqaalka",
  statistics: "Tirada Xogta",
  recentActivity: "Ficil la Filaan Yare",
  totalPrices: "Jidh Qiimaha",
  priceChanges: "Isbeddelka Qiimaha",
  topProviders: "Ugu Fiican Wasiirada",
  reports: "Warbixino",
  export: "Soo Saari",
} as const;

// ============================================
// ADMIN PANEL / PANEL MAAMULKA
// ============================================

export const ADMIN_PANEL = {
  title: "Panel Maamulka",
  users: "Isticmaaliyaha",
  companies: "Shirkadaha",
  prices: "Qiimaha",
  reports: "Warbixino",
  settings: "Xayaysiinta",
  approvals: "Ogolaada",
  documents: "Dukumentiyada",
  logs: "Diiwaanada",
} as const;

// ============================================
// PRICES / QIIMAHA
// ============================================

export const PRICES = {
  title: "Qiimaha",
  currentPrice: "Qiimaha Hadda",
  previousPrice: "Qiimaha Hore",
  highPrice: "Qiimaha Sare",
  lowPrice: "Qiimaha Hoose",
  averagePrice: "Qiimaha Giddi",
  addPrice: "Roo Daaree Qiimaha",
  editPrice: "Cusbii Samee Qiimaha",
  deletePrice: "Tir Qiimaha",
  viewHistory: "Eeg Taariikhda",
} as const;

// ============================================
// REPORTS / WARBIXINO
// ============================================

export const REPORTS = {
  title: "Warbixino",
  daily: "Maalinlaha",
  weekly: "Toddobaadlaha",
  monthly: "Bilaha",
  quarterly: "Rubuc Sanadlaha",
  yearly: "Sanadlaha",
  custom: "Gaaban",
  generateReport: "Sameynta Warbixinta",
  downloadReport: "Soo Dejiye Warbixinta",
} as const;

// ============================================
// TIME PERIODS / WAQIGU
// ============================================

export const TIME_PERIODS = {
  today: "Maanta",
  yesterday: "Shalay",
  thisWeek: "Toddobaaddan",
  lastWeek: "Toddobaad Hore",
  thisMonth: "Bilaan",
  lastMonth: "Bilow Hore",
  thisYear: "Sannaddan",
  lastYear: "Sanad Hore",
  allTime: "Waqti Walba",
} as const;

// ============================================
// ERROR MESSAGES / FARIIN CILADA
// ============================================

export const ERROR_MESSAGES = {
  networkError: "Khalad Shabakada",
  serverError: "Khalad Sareeri",
  notFound: "Lama Helin",
  unauthorized: "Fikir La'",
  forbidden: "Marinnimo",
  badRequest: "Calaacal Khaldan",
  timeout: "Waqtigii Waa Dhamaatay",
  tryAgain: "Isku Day Markale",
  contactSupport: "La Xiriir Taaggerada",
} as const;

// ============================================
// SUCCESS MESSAGES / FARIIN GUULAHA
// ============================================

export const SUCCESS_MESSAGES = {
  saved: "Keydiway",
  updated: "Cusbii Loodaysay",
  deleted: "Tirdey",
  created: "Abuuray",
  approved: "Ogolow Galay",
  rejected: "Diidday",
  sent: "Soo Gudbey",
  completed: "Dhammaatey",
} as const;

// ============================================
// HELP TEXT / GARGAARKA
// ============================================

export const HELP_TEXT = {
  emailHelp: "Emailka Muddaca Gaarka Ah",
  passwordHelp: "Sirrta Ka Yar 8 Caraf",
  phoneHelp: "Lambarka Waqooyi +252",
  priceHelp: "Qiimaha Hadda Suuqa",
  dateHelp: "Taraarikha Shaharaha",
} as const;

export default {
  SYSTEM_NAME,
  SYSTEM_SHORT,
  NAV_ITEMS,
  AUTH_LABELS,
  ROLES_SOMALI,
  SECTOR_LABELS,
  ACTIONS,
  MESSAGES,
  STATUS_VALUES,
  DASHBOARD,
  ADMIN_PANEL,
  PRICES,
  REPORTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};
