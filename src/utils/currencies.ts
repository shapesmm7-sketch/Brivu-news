import { CurrencyConfig } from '../types';

/**
 * Maps ISO 4217 Currency Code to Country Flag Emoji
 */
const CURRENCY_COUNTRY_OVERRIDES: Record<string, string> = {
  EUR: 'EU', // European Union 🇪🇺
  ANG: 'CW', // Curaçao & Sint Maarten 🇨🇼
  XOF: 'SN', // West African CFA Franc (BCEAO - Senegal/Ivory Coast/etc.) 🇸🇳
  XAF: 'CM', // Central African CFA Franc (BEAC - Cameroon/Gabon/etc.) 🇨🇲
  XCD: 'AG', // East Caribbean Dollar (OECS) 🇦🇬
  BTC: '🌐',
};

export function getCurrencyFlag(code: string): string {
  if (!code) return '🌐';
  const cleanCode = code.trim().toUpperCase();
  if (CURRENCY_COUNTRY_OVERRIDES[cleanCode]) {
    const val = CURRENCY_COUNTRY_OVERRIDES[cleanCode];
    if (val.length === 2) {
      return val.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
    }
    return val;
  }
  const cc = cleanCode.slice(0, 2);
  if (/^[A-Z]{2}$/.test(cc)) {
    return cc.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  }
  return '🌐';
}

const RAW_SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  {
    "code": "AFN",
    "name": "Afghan Afghani",
    "symbol": "؋",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "ALL",
    "name": "Albanian Lek",
    "symbol": "L ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "DZD",
    "name": "Algerian Dinar",
    "symbol": "DA ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "AOA",
    "name": "Angolan Kwanza",
    "symbol": "Kz ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "ARS",
    "name": "Argentine Peso",
    "symbol": "$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "AMD",
    "name": "Armenian Dram",
    "symbol": "֏",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "AWG",
    "name": "Aruban Florin",
    "symbol": "ƒ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "AUD",
    "name": "Australian Dollar",
    "symbol": "A$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "AZN",
    "name": "Azerbaijani Manat",
    "symbol": "₼",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BSD",
    "name": "Bahamian Dollar",
    "symbol": "B$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BHD",
    "name": "Bahraini Dinar",
    "symbol": "BHD ",
    "symbolPosition": "prefix",
    "decimalPlaces": 3
  },
  {
    "code": "BDT",
    "name": "Bangladeshi Taka",
    "symbol": "৳",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BBD",
    "name": "Barbadian Dollar",
    "symbol": "Bds$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BZD",
    "name": "Belize Dollar",
    "symbol": "BZ$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BMD",
    "name": "Bermudian Dollar",
    "symbol": "BD$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BTN",
    "name": "Bhutanese Ngultrum",
    "symbol": "Nu. ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BOB",
    "name": "Bolivian Boliviano",
    "symbol": "Bs. ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BAM",
    "name": "Bosnia-Herzegovina Convertible Mark",
    "symbol": "KM ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "BWP",
    "name": "Botswanan Pula",
    "symbol": "P ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BRL",
    "name": "Brazilian Real",
    "symbol": "R$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "GBP",
    "name": "British Pound",
    "symbol": "£",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BND",
    "name": "Brunei Dollar",
    "symbol": "B$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "BGN",
    "name": "Bulgarian Lev",
    "symbol": "лв ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "BIF",
    "name": "Burundian Franc",
    "symbol": "FBu ",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "KHR",
    "name": "Cambodian Riel",
    "symbol": "៛",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "CAD",
    "name": "Canadian Dollar",
    "symbol": "C$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "CVE",
    "name": "Cape Verdean Escudo",
    "symbol": "$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "KYD",
    "name": "Cayman Islands Dollar",
    "symbol": "CI$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "XOF",
    "name": "CFA Franc BCEAO",
    "symbol": "CFA ",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "XAF",
    "name": "CFA Franc BEAC",
    "symbol": "FCFA ",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "CLP",
    "name": "Chilean Peso",
    "symbol": "$",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "CNY",
    "name": "Chinese Yuan",
    "symbol": "¥",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "COP",
    "name": "Colombian Peso",
    "symbol": "$",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "CDF",
    "name": "Congolese Franc",
    "symbol": "FC ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "CRC",
    "name": "Costa Rican Colón",
    "symbol": "₡",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "HRK",
    "name": "Croatian Kuna",
    "symbol": "kn ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "CZK",
    "name": "Czech Koruna",
    "symbol": "Kč ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "DJF",
    "name": "Djiboutian Franc",
    "symbol": "Fdj ",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "DOP",
    "name": "Dominican Peso",
    "symbol": "RD$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "XCD",
    "name": "East Caribbean Dollar",
    "symbol": "EC$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "EGP",
    "name": "Egyptian Pound",
    "symbol": "E£ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "ETB",
    "name": "Ethiopian Birr",
    "symbol": "Br ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "EUR",
    "name": "Euro",
    "symbol": "€",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "FJD",
    "name": "Fijian Dollar",
    "symbol": "FJ$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "GMD",
    "name": "Gambian Dalasi",
    "symbol": "D ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "GEL",
    "name": "Georgian Lari",
    "symbol": "₾",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "GHS",
    "name": "Ghanaian Cedi",
    "symbol": "GH₵",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "GTQ",
    "name": "Guatemalan Quetzal",
    "symbol": "Q",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "GYD",
    "name": "Guyanese Dollar",
    "symbol": "G$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "HTG",
    "name": "Haitian Gourde",
    "symbol": "G ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "HNL",
    "name": "Honduran Lempira",
    "symbol": "L ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "HKD",
    "name": "Hong Kong Dollar",
    "symbol": "HK$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "HUF",
    "name": "Hungarian Forint",
    "symbol": "Ft ",
    "symbolPosition": "suffix",
    "decimalPlaces": 0
  },
  {
    "code": "ISK",
    "name": "Icelandic Króna",
    "symbol": "kr ",
    "symbolPosition": "suffix",
    "decimalPlaces": 0
  },
  {
    "code": "INR",
    "name": "Indian Rupee",
    "symbol": "₹",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "IDR",
    "name": "Indonesian Rupiah",
    "symbol": "Rp ",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "IQD",
    "name": "Iraqi Dinar",
    "symbol": "ع.د ",
    "symbolPosition": "prefix",
    "decimalPlaces": 3
  },
  {
    "code": "ILS",
    "name": "Israeli New Shekel",
    "symbol": "₪",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "JMD",
    "name": "Jamaican Dollar",
    "symbol": "J$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "JPY",
    "name": "Japanese Yen",
    "symbol": "¥",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "JOD",
    "name": "Jordanian Dinar",
    "symbol": "JD ",
    "symbolPosition": "prefix",
    "decimalPlaces": 3
  },
  {
    "code": "KZT",
    "name": "Kazakhstani Tenge",
    "symbol": "₸",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "KES",
    "name": "Kenyan Shilling",
    "symbol": "KSh ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "KWD",
    "name": "Kuwaiti Dinar",
    "symbol": "KWD ",
    "symbolPosition": "prefix",
    "decimalPlaces": 3
  },
  {
    "code": "KGS",
    "name": "Kyrgystani Som",
    "symbol": "сом ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "LAK",
    "name": "Laotian Kip",
    "symbol": "₭",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "LBP",
    "name": "Lebanese Pound",
    "symbol": "L£ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "LSL",
    "name": "Lesotho Loti",
    "symbol": "L ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "LRD",
    "name": "Liberian Dollar",
    "symbol": "L$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "LYD",
    "name": "Libyan Dinar",
    "symbol": "LD ",
    "symbolPosition": "prefix",
    "decimalPlaces": 3
  },
  {
    "code": "MOP",
    "name": "Macanese Pataca",
    "symbol": "MOP$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MKD",
    "name": "Macedonian Denar",
    "symbol": "ден ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "MGA",
    "name": "Malagasy Ariary",
    "symbol": "Ar ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MWK",
    "name": "Malawian Kwacha",
    "symbol": "MK ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MYR",
    "name": "Malaysian Ringgit",
    "symbol": "RM ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MVR",
    "name": "Maldivian Rufiyaa",
    "symbol": "Rf ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MUR",
    "name": "Mauritian Rupee",
    "symbol": "₨ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MXN",
    "name": "Mexican Peso",
    "symbol": "$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MDL",
    "name": "Moldovan Leu",
    "symbol": "L ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "MNT",
    "name": "Mongolian Tugrik",
    "symbol": "₮",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MAD",
    "name": "Moroccan Dirham",
    "symbol": "MAD ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MZN",
    "name": "Mozambican Metical",
    "symbol": "MT ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "MMK",
    "name": "Myanmar Kyat",
    "symbol": "K ",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "NAD",
    "name": "Namibian Dollar",
    "symbol": "N$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "NPR",
    "name": "Nepalese Rupee",
    "symbol": "₨ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "ANG",
    "name": "Netherlands Antillean Guilder",
    "symbol": "ƒ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "TWD",
    "name": "New Taiwan Dollar",
    "symbol": "NT$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "NZD",
    "name": "New Zealand Dollar",
    "symbol": "NZ$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "NIO",
    "name": "Nicaraguan Córdoba",
    "symbol": "C$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "NGN",
    "name": "Nigerian Naira",
    "symbol": "₦",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "NOK",
    "name": "Norwegian Krone",
    "symbol": "kr ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "OMR",
    "name": "Omani Rial",
    "symbol": "OMR ",
    "symbolPosition": "prefix",
    "decimalPlaces": 3
  },
  {
    "code": "PKR",
    "name": "Pakistani Rupee",
    "symbol": "₨ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "PAB",
    "name": "Panamanian Balboa",
    "symbol": "B/. ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "PGK",
    "name": "Papua New Guinean Kina",
    "symbol": "K ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "PYG",
    "name": "Paraguayan Guarani",
    "symbol": "₲",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "PEN",
    "name": "Peruvian Sol",
    "symbol": "S/ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "PHP",
    "name": "Philippine Peso",
    "symbol": "₱",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "PLN",
    "name": "Polish Zloty",
    "symbol": "zł ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "QAR",
    "name": "Qatari Riyal",
    "symbol": "QAR ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "RON",
    "name": "Romanian Leu",
    "symbol": "lei ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "RUB",
    "name": "Russian Ruble",
    "symbol": "₽",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "RWF",
    "name": "Rwandan Franc",
    "symbol": "FRw ",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "WST",
    "name": "Samoan Tala",
    "symbol": "WS$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SAR",
    "name": "Saudi Riyal",
    "symbol": "SAR ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "RSD",
    "name": "Serbian Dinar",
    "symbol": "din ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "SCR",
    "name": "Seychellois Rupee",
    "symbol": "₨ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SLL",
    "name": "Sierra Leonean Leone",
    "symbol": "Le ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SGD",
    "name": "Singapore Dollar",
    "symbol": "S$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SBD",
    "name": "Solomon Islands Dollar",
    "symbol": "SI$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SOS",
    "name": "Somali Shilling",
    "symbol": "S ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "ZAR",
    "name": "South African Rand",
    "symbol": "R ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "KRW",
    "name": "South Korean Won",
    "symbol": "₩",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "LKR",
    "name": "Sri Lankan Rupee",
    "symbol": "₨ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SDG",
    "name": "Sudanese Pound",
    "symbol": "SDG ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SRD",
    "name": "Surinamese Dollar",
    "symbol": "$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SZL",
    "name": "Swazi Lilangeni",
    "symbol": "E ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SEK",
    "name": "Swedish Krona",
    "symbol": "kr ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "CHF",
    "name": "Swiss Franc",
    "symbol": "CHF ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "SYP",
    "name": "Syrian Pound",
    "symbol": "£S ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "TJS",
    "name": "Tajikistani Somoni",
    "symbol": "SM ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "TZS",
    "name": "Tanzanian Shilling",
    "symbol": "TSh ",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "THB",
    "name": "Thai Baht",
    "symbol": "฿",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "TOP",
    "name": "Tongan Paʻanga",
    "symbol": "T$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "TTD",
    "name": "Trinidad and Tobago Dollar",
    "symbol": "TT$ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "TND",
    "name": "Tunisian Dinar",
    "symbol": "DT ",
    "symbolPosition": "prefix",
    "decimalPlaces": 3
  },
  {
    "code": "TRY",
    "name": "Turkish Lira",
    "symbol": "₺",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "AED",
    "name": "UAE Dirham",
    "symbol": "AED ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "UGX",
    "name": "Ugandan Shilling",
    "symbol": "UGX ",
    "symbolPosition": "prefix",
    "decimalPlaces": 0
  },
  {
    "code": "UAH",
    "name": "Ukrainian Hryvnia",
    "symbol": "₴",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "UYU",
    "name": "Uruguayan Peso",
    "symbol": "$U ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "USD",
    "name": "US Dollar",
    "symbol": "$",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "UZS",
    "name": "Uzbekistan Som",
    "symbol": "soʻm ",
    "symbolPosition": "suffix",
    "decimalPlaces": 2
  },
  {
    "code": "VUV",
    "name": "Vanuatu Vatu",
    "symbol": "VT ",
    "symbolPosition": "suffix",
    "decimalPlaces": 0
  },
  {
    "code": "VES",
    "name": "Venezuelan Bolívar",
    "symbol": "Bs.S. ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "VND",
    "name": "Vietnamese Dong",
    "symbol": "₫",
    "symbolPosition": "suffix",
    "decimalPlaces": 0
  },
  {
    "code": "YER",
    "name": "Yemeni Rial",
    "symbol": "﷼ ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  },
  {
    "code": "ZMW",
    "name": "Zambian Kwacha",
    "symbol": "ZK ",
    "symbolPosition": "prefix",
    "decimalPlaces": 2
  }
];

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = RAW_SUPPORTED_CURRENCIES.map((c) => ({
  ...c,
  flag: getCurrencyFlag(c.code),
}));

export function getCurrencyConfig(code: string): CurrencyConfig {
  const found = SUPPORTED_CURRENCIES.find(
    (c) => c.code.toUpperCase() === (code || 'UGX').toUpperCase()
  );
  if (found) return found;
  return {
    code: code || 'UGX',
    name: code || 'UGX',
    symbol: `${code} `,
    symbolPosition: 'prefix',
    decimalPlaces: 2,
    flag: getCurrencyFlag(code || 'UGX'),
  };
}

/**
 * Safely rounds money to prevent floating-point inaccuracies and handles string or number inputs safely
 */
export function roundMoney(amount: number | string, decimalPlaces = 2): number {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0;
  if (isNaN(numericAmount) || !isFinite(numericAmount)) return 0;
  const factor = Math.pow(10, decimalPlaces);
  return Math.round((numericAmount + Number.EPSILON) * factor) / factor;
}

/**
 * Formats a monetary amount into a clean, human-readable string
 */
export function formatCurrency(amount: number | string, currencyCode = 'UGX'): string {
  const config = getCurrencyConfig(currencyCode);
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0;
  const safeAmount = roundMoney(numericAmount, config.decimalPlaces);

  // Format with thousands separator
  const parts = safeAmount.toFixed(config.decimalPlaces).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber = parts.join('.');

  if (config.symbolPosition === 'suffix') {
    return `${formattedNumber} ${config.symbol}`.trim();
  }
  return `${config.symbol}${formattedNumber}`;
}

/**
 * Formats ISO date to readable date and time
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}
