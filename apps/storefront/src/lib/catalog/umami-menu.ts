/**
 * Umami Manama — real menu catalog (BHD).
 * Used for fast storefront display and Medusa seed sync.
 */
export type CatalogModifier = {
  id: string
  name_ar: string
  name_en: string
  price: number
}

export type CatalogProduct = {
  handle: string
  name_ar: string
  name_en: string
  description_ar: string
  description_en: string
  price: number
  section: "mains" | "sides" | "drinks"
  /** Soft drink flavors shown as options (not separate products) */
  flavors?: string[]
  side_note_ar?: string
}

export const UMAMI_MODIFIERS: CatalogModifier[] = [
  { id: "sausage", name_ar: "نقانق", name_en: "Sausage", price: 0.2 },
  { id: "veg", name_ar: "خضار", name_en: "Vegetables", price: 0.3 },
  { id: "chicken", name_ar: "دجاج", name_en: "Chicken", price: 0.5 },
  { id: "jalapeno", name_ar: "هالبينو", name_en: "Jalapeño", price: 0.15 },
  { id: "extra-cheese", name_ar: "اكسترا جبن", name_en: "Extra cheese", price: 0.2 },
  { id: "mini-corn", name_ar: "ميني ذرة", name_en: "Mini corn", price: 0.2 },
  {
    id: "peri-peri",
    name_ar: "صوص البيري بيري",
    name_en: "Peri peri sauce",
    price: 0.25,
  },
]

export const UMAMI_PRODUCTS: CatalogProduct[] = [
  {
    handle: "ramen-cheesy-bunch-sausage",
    name_ar: "رامن تشيزي بانش بالنقانق",
    name_en: "Cheesy Bunch Ramen with Sausage",
    description_ar: "رامن أجبان بصلصة صويانية خفيفة تقدم مع قطع النقانق",
    description_en: "Cheesy ramen in a light soy sauce with sausage pieces",
    price: 1.8,
    section: "mains",
  },
  {
    handle: "ramen-cheesy-bunch-chicken",
    name_ar: "رامن تشيزي بانش بالدجاج",
    name_en: "Cheesy Bunch Ramen with Chicken",
    description_ar: "رامن أجبان بصلصة صويانية خفيفة تقدم مع قطع الدجاج المقرمشة",
    description_en: "Cheesy ramen in a light soy sauce with crispy chicken",
    price: 2.0,
    section: "mains",
  },
  {
    handle: "ramen-teriyaki",
    name_ar: "رامن ترياكي",
    name_en: "Teriyaki Ramen",
    description_ar: "رامن بصوص الترياكي المتوازن بين الحلو والمالح",
    description_en: "Ramen with balanced sweet-savory teriyaki sauce",
    price: 1.5,
    section: "mains",
  },
  {
    handle: "ramen-pastalia",
    name_ar: "رامن باستاليا",
    name_en: "Pastalia Ramen",
    description_ar: "رامن حامض إيطالي بنكهة الباستا المميزة",
    description_en: "Tangy Italian-inspired ramen with pasta vibes",
    price: 2.0,
    section: "mains",
  },
  {
    handle: "ramen-umami",
    name_ar: "رامن وامي",
    name_en: "Umami Ramen",
    description_ar: "رامن تمبورا الخضار بنكهة آسيوية مميزة",
    description_en: "Vegetable tempura ramen with Asian umami notes",
    price: 1.8,
    section: "mains",
  },
  {
    handle: "ramen-limezy-bunch",
    name_ar: "رامن ليمزي بانش",
    name_en: "Limezy Bunch Ramen",
    description_ar: "مزيج من الحامض والحلو مع لذعة حرارة خفيفة",
    description_en: "Sweet-sour mix with a gentle heat kick",
    price: 1.5,
    section: "mains",
  },
  {
    handle: "japanese-fries",
    name_ar: "جابانيز فرايز",
    name_en: "Japanese Fries",
    description_ar: "يقدم بالدجاج أو اللحم",
    description_en: "Served with chicken or beef",
    price: 1.8,
    section: "sides",
  },
  {
    handle: "japanese-fries-shrimp",
    name_ar: "جابانيز فرايز شريمب",
    name_en: "Japanese Fries Shrimp",
    description_ar: "جابانيز فرايز مع الروبيان",
    description_en: "Japanese fries with shrimp",
    price: 2.0,
    section: "sides",
  },
  {
    handle: "karaage-chicken",
    name_ar: "كاراغي دجاج",
    name_en: "Chicken Karaage",
    description_ar: "يمكن إضافة: صوص البيري بيري",
    description_en: "Optional peri peri sauce",
    price: 1.5,
    section: "sides",
  },
  {
    handle: "water",
    name_ar: "ماء",
    name_en: "Water",
    description_ar: "ماء",
    description_en: "Bottled water",
    price: 0.1,
    section: "drinks",
  },
  {
    handle: "umami-soft-drink",
    name_ar: "مشروب غازي",
    name_en: "Soft Drink",
    description_ar: "كولا، ريج، برتقال، ستريس، توت",
    description_en: "Cola, Reg, Orange, Citrus, Berry",
    price: 0.25,
    section: "drinks",
    flavors: ["كولا", "ريج", "برتقال", "ستريس", "توت"],
  },
]

export const UMAMI_SECTIONS = [
  { id: "mains", name_ar: "الأطباق الرئيسية", name_en: "Mains", emoji: "🍜" },
  { id: "sides", name_ar: "الأطباق الجانبية", name_en: "Sides", emoji: "🍟" },
  { id: "drinks", name_ar: "المشروبات", name_en: "Drinks", emoji: "🥤" },
] as const

export function formatBhd(amount: number) {
  return `${amount.toFixed(3)} BD`
}
