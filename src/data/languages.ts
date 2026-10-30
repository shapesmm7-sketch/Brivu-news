export interface AppLanguage {
  code: string;
  name: string;
  nativeName: string;
  country: string;
  flag: string;
}

export const WORLD_LANGUAGES: AppLanguage[] = [
  // Global & Major International Languages
  { code: 'en', name: 'English', nativeName: 'English', country: 'United States / United Kingdom / Global', flag: '🇺🇸' },
  { code: 'sw', name: 'Swahili / Kiswahili', nativeName: 'Kiswahili', country: 'Kenya, Tanzania, Uganda, Rwanda, DRC', flag: '🇰🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', country: 'France, Senegal, Ivory Coast, DRC, Canada', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', country: 'Spain, Mexico, Colombia, Argentina', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Egypt, Saudi Arabia, UAE, North Africa', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', country: 'Brazil, Portugal, Angola, Mozambique', flag: '🇧🇷' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', country: 'India', flag: '🇮🇳' },
  { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文 (普通话)', country: 'China, Taiwan, Singapore', flag: '🇨🇳' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', country: 'Germany, Austria, Switzerland', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', country: 'Russia, Kazakhstan, Belarus', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', country: 'Japan', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', country: 'South Korea', flag: '🇰🇷' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', country: 'Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', country: 'Malaysia, Brunei, Singapore', flag: '🇲🇾' },
  { code: 'tl', name: 'Tagalog / Filipino', nativeName: 'Wikang Tagalog', country: 'Philippines', flag: '🇵🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', country: 'Vietnam', flag: '🇻🇳' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', country: 'Turkey, Northern Cyprus', flag: '🇹🇷' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', country: 'Bangladesh, India (West Bengal)', flag: '🇧🇩' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', country: 'Pakistan, India', flag: '🇵🇰' },
  { code: 'fa', name: 'Persian / Farsi', nativeName: 'فارسی', country: 'Iran, Afghanistan, Tajikistan', flag: '🇮🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', country: 'Italy, Switzerland', flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', country: 'Netherlands, Belgium, Suriname', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', country: 'Poland', flag: '🇵🇱' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', country: 'Thailand', flag: '🇹🇭' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', country: 'Ukraine', flag: '🇺🇦' },

  // African Languages & Dialects (50+ Languages)
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá', country: 'Nigeria, Benin, Togo', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo', country: 'Nigeria', flag: '🇳🇬' },
  { code: 'ha', name: 'Hausa', nativeName: 'Harshen Hausa', country: 'Nigeria, Niger, Ghana, Chad', flag: '🇳🇬' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', country: 'Ethiopia', flag: '🇪🇹' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', country: 'Ethiopia, Kenya', flag: '🇪🇹' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', country: 'Eritrea, Ethiopia', flag: '🇪🇷' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', country: 'Somalia, Djibouti, Ethiopia, Kenya', flag: '🇸🇴' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', country: 'Rwanda, Uganda, DRC', flag: '🇷🇼' },
  { code: 'rn', name: 'Kirundi', nativeName: 'Ikirundi', country: 'Burundi', flag: '🇧🇮' },
  { code: 'lg', name: 'Luganda', nativeName: 'Oluganda', country: 'Uganda', flag: '🇺🇬' },
  { code: 'nyn', name: 'Runyankole', nativeName: 'Runyankole', country: 'Uganda', flag: '🇺🇬' },
  { code: 'luo', name: 'Dholuo / Luo', nativeName: 'Dholuo', country: 'Kenya, Tanzania, Uganda', flag: '🇰🇪' },
  { code: 'kik', name: 'Kikuyu / Gikuyu', nativeName: 'Gĩkũyũ', country: 'Kenya', flag: '🇰🇪' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', country: 'South Africa', flag: '🇿🇦' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', country: 'South Africa', flag: '🇿🇦' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', country: 'South Africa, Namibia', flag: '🇿🇦' },
  { code: 'sn', name: 'Shona', nativeName: 'chiShona', country: 'Zimbabwe', flag: '🇿🇼' },
  { code: 'nr', name: 'Ndebele', nativeName: 'isiNdebele', country: 'Zimbabwe, South Africa', flag: '🇿🇼' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', country: 'Madagascar', flag: '🇲🇬' },
  { code: 'wo', name: 'Wolof', nativeName: 'Wolof', country: 'Senegal, Gambia, Mauritania', flag: '🇸🇳' },
  { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan', country: 'Mali', flag: '🇲🇱' },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingála', country: 'DR Congo, Congo Republic', flag: '🇨🇩' },
  { code: 'lu', name: 'Tshiluba', nativeName: 'Tshiluba', country: 'DR Congo', flag: '🇨🇩' },
  { code: 'st', name: 'Sesotho / Sotho', nativeName: 'Sesotho', country: 'Lesotho, South Africa', flag: '🇱🇸' },
  { code: 'tn', name: 'Setswana / Tswana', nativeName: 'Setswana', country: 'Botswana, South Africa', flag: '🇧🇼' },
  { code: 'ss', name: 'Siswati / Swati', nativeName: 'siSwati', country: 'Eswatini, South Africa', flag: '🇸🇿' },
  { code: 'ts', name: 'Xitsonga / Tsonga', nativeName: 'Xitsonga', country: 'South Africa, Mozambique', flag: '🇿🇦' },
  { code: 've', name: 'Tshivenda / Venda', nativeName: 'Tshivenda', country: 'South Africa, Zimbabwe', flag: '🇿🇦' },
  { code: 'ny', name: 'Chichewa / Nyanja', nativeName: 'Chichewa', country: 'Malawi, Zambia, Mozambique', flag: '🇲🇼' },
  { code: 'bem', name: 'Bemba', nativeName: 'Icibemba', country: 'Zambia, DRC', flag: '🇿🇲' },
  { code: 'tum', name: 'Tumbuka', nativeName: 'chiTumbuka', country: 'Malawi, Zambia', flag: '🇲🇼' },
  { code: 'aa', name: 'Afar', nativeName: 'Qafar af', country: 'Djibouti, Ethiopia, Eritrea', flag: '🇩🇯' },
  { code: 'ff', name: 'Fula / Fulfulde', nativeName: 'Fulfulde', country: 'West & Central Africa', flag: '🇬🇳' },
  { code: 'ee', name: 'Ewe', nativeName: 'Èʋegbe', country: 'Ghana, Togo', flag: '🇬🇭' },
  { code: 'ak', name: 'Twi / Akan', nativeName: 'Asante Twi', country: 'Ghana', flag: '🇬🇭' },
  { code: 'gaa', name: 'Ga', nativeName: 'Ga', country: 'Ghana', flag: '🇬🇭' },
  { code: 'kmr', name: 'Kamba', nativeName: 'Kikamba', country: 'Kenya', flag: '🇰🇪' },
  { code: 'mer', name: 'Meru', nativeName: 'Kĩmĩrũ', country: 'Kenya', flag: '🇰🇪' },
  { code: 'kln', name: 'Kalenjin', nativeName: 'Kalenjin', country: 'Kenya', flag: '🇰🇪' },
  { code: 'kis', name: 'Kisii / Ekegusii', nativeName: 'Ekegusii', country: 'Kenya', flag: '🇰🇪' },
  { code: 'saq', name: 'Samburu', nativeName: 'Samburu', country: 'Kenya', flag: '🇰🇪' },

  // South Asian & Indian Regional Languages
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', country: 'India, Pakistan', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', country: 'India', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', country: 'India', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', country: 'India, Sri Lanka, Singapore, Malaysia', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', country: 'India', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', country: 'India', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'கன்னட', country: 'India', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', country: 'India', flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', country: 'India', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', country: 'Nepal, India', flag: '🇳🇵' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'dv', name: 'Dhivehi', nativeName: 'ދިވެހި', country: 'Maldives', flag: '🇲🇻' },

  // Southeast Asian & East Asian Languages
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', country: 'Cambodia', flag: '🇰🇭' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', country: 'Laos', flag: '🇱🇦' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာစာ', country: 'Myanmar', flag: '🇲🇲' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', country: 'Indonesia', flag: '🇮🇩' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', country: 'Indonesia', flag: '🇮🇩' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Bisaya', country: 'Philippines', flag: '🇵🇭' },
  { code: 'ilo', name: 'Ilocano', nativeName: 'Ilokano', country: 'Philippines', flag: '🇵🇭' },
  { code: 'hil', name: 'Hiligaynon', nativeName: 'Ilonggo', country: 'Philippines', flag: '🇵🇭' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', country: 'Taiwan, Hong Kong', flag: '🇹🇼' },
  { code: 'yue', name: 'Cantonese', nativeName: '粵語 / 廣東話', country: 'Hong Kong, Macao, China', flag: '🇭🇰' },

  // Middle Eastern & Central Asian Languages
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', country: 'Afghanistan, Pakistan', flag: '🇦🇫' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî / کوردی', country: 'Iraq, Syria, Turkey, Iran', flag: '🇮🇶' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', country: 'Israel', flag: '🇮🇱' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', country: 'Armenia', flag: '🇦🇲' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', country: 'Georgia', flag: '🇬🇪' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan dili', country: 'Azerbaijan, Iran', flag: '🇦🇿' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbek tili", country: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ тілі', country: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', country: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', country: 'Tajikistan', flag: '🇹🇯' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen dili', country: 'Turkmenistan', flag: '🇹🇲' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол хэл', country: 'Mongolia', flag: '🇲🇳' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', country: 'Central Asia, China', flag: '🇨🇳' },
  { code: 'bo', name: 'Tibetan', nativeName: 'བོད་སྐད', country: 'Tibet, Nepal, India', flag: '🇨🇳' },

  // European Languages
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', country: 'Greece, Cyprus', flag: '🇬🇷' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', country: 'Romania, Moldova', flag: '🇷🇴' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', country: 'Hungary', flag: '🇭🇺' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', country: 'Czech Republic', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', country: 'Slovakia', flag: '🇸🇰' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', country: 'Bulgaria', flag: '🇧🇬' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', country: 'Serbia, Bosnia', flag: '🇷🇸' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', country: 'Croatia', flag: '🇭🇷' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', country: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', country: 'Slovenia', flag: '🇸🇮' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', country: 'North Macedonia', flag: '🇲🇰' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', country: 'Albania, Kosovo', flag: '🇦🇱' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', country: 'Lithuania', flag: '🇱🇹' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', country: 'Latvia', flag: '🇱🇻' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', country: 'Estonia', flag: '🇪🇪' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', country: 'Finland', flag: '🇫🇮' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', country: 'Sweden, Finland', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', country: 'Norway', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', country: 'Denmark', flag: '🇩🇰' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', country: 'Iceland', flag: '🇮🇸' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', country: 'Ireland', flag: '🇮🇪' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', country: 'United Kingdom (Wales)', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', country: 'Spain, France', flag: '🇪🇸' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', country: 'Spain, Andorra', flag: '🇪🇸' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', country: 'Spain', flag: '🇪🇸' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', country: 'Malta', flag: '🇲🇹' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', country: 'Belarus', flag: '🇧🇾' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', country: 'Luxembourg', flag: '🇱🇺' },

  // Americas & Indigenous Languages
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen', country: 'Haiti', flag: '🇭🇹' },
  { code: 'pap', name: 'Papiamento', nativeName: 'Papiamentu', country: 'Aruba, Curaçao, Bonaire', flag: '🇦🇼' },
  { code: 'gn', name: 'Guarani', nativeName: "Avañe'ẽ", country: 'Paraguay, Argentina, Bolivia', flag: '🇵🇾' },
  { code: 'qu', name: 'Quechua', nativeName: 'Runa Simi', country: 'Peru, Bolivia, Ecuador', flag: '🇵🇪' },
  { code: 'ay', name: 'Aymara', nativeName: 'Aymar aru', country: 'Bolivia, Peru', flag: '🇧🇴' },
  { code: 'nah', name: 'Nahuatl', nativeName: 'Nāhuatl', country: 'Mexico', flag: '🇲🇽' },
  { code: 'myn', name: 'Maya / Yucatec', nativeName: "Maaya t'aan", country: 'Mexico, Guatemala', flag: '🇲🇽' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', country: 'United States (Hawaii)', flag: '🇺🇸' },

  // Pacific & Oceania Languages
  { code: 'mi', name: 'Māori', nativeName: 'Te Reo Māori', country: 'New Zealand', flag: '🇳🇿' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Sāmoa', country: 'Samoa, American Samoa', flag: '🇼🇸' },
  { code: 'fj', name: 'Fijian', nativeName: 'Na Vosa Vakaviti', country: 'Fiji', flag: '🇫🇯' },
  { code: 'to', name: 'Tongan', nativeName: 'Lea Faka-Tonga', country: 'Tonga', flag: '🇹🇴' },
  { code: 'tpi', name: 'Tok Pisin', nativeName: 'Tok Pisin', country: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'bi', name: 'Bislama', nativeName: 'Bislama', country: 'Vanuatu', flag: '🇻🇺' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', country: 'International Auxiliary', flag: '🌐' },
];

export function getLanguageByCode(code?: string): AppLanguage {
  if (!code) return WORLD_LANGUAGES[0];
  const q = code.trim().toLowerCase();
  if (!q) return WORLD_LANGUAGES[0];

  const found = WORLD_LANGUAGES.find((l) => {
    const lCode = l.code.toLowerCase();
    const lName = l.name.toLowerCase();
    const lNative = l.nativeName.toLowerCase();

    return (
      lCode === q ||
      lName === q ||
      lNative === q ||
      lName.includes(q) ||
      q.includes(lName) ||
      q.includes(lCode) ||
      lNative.includes(q)
    );
  });

  return found || WORLD_LANGUAGES[0];
}
