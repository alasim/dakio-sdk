/**
 * Bangladesh helpers for a storefront: the 64 districts and their thanas
 * (same list Dakio's built-in store uses), phone checks, the delivery zone
 * rule and taka formatting. No network, no dependencies — safe anywhere.
 *
 *   import { DISTRICTS, getThanas, isBdPhone, deliveryZone } from '@dakio/sdk/bd'
 */

export const DISTRICTS: readonly string[] = [
  'Bagerhat','Bandarban','Barguna','Barishal','Bhola','Bogura','Brahmanbaria',
  'Chandpur','Chapai Nawabganj','Chattogram','Chuadanga','Cox\'s Bazar','Cumilla',
  'Dhaka','Dinajpur','Faridpur','Feni','Gaibandha','Gazipur','Gopalganj',
  'Habiganj','Jamalpur','Jashore','Jhalokati','Jhenaidah','Joypurhat',
  'Khagrachhari','Khulna','Kishoreganj','Kurigram','Kushtia','Lakshmipur',
  'Lalmonirhat','Madaripur','Magura','Manikganj','Meherpur','Moulvibazar',
  'Munshiganj','Mymensingh','Naogaon','Narail','Narayanganj','Narsingdi',
  'Natore','Netrokona','Nilphamari','Noakhali','Pabna','Panchagarh',
  'Patuakhali','Pirojpur','Rajbari','Rajshahi','Rangamati','Rangpur',
  'Satkhira','Shariatpur','Sherpur','Sirajganj','Sunamganj','Sylhet',
  'Tangail','Thakurgaon',
]

export const THANAS: Record<string, string[]> = {
  'Bagerhat': ['Bagerhat Sadar','Chitalmari','Fakirhat','Kachua','Mollahat','Mongla','Morrelganj','Rampal','Sarankhola'],
  'Bandarban': ['Alikadam','Bandarban Sadar','Lama','Naikhongchhari','Rowangchhari','Ruma','Thanchi'],
  'Barguna': ['Amtali','Bamna','Barguna Sadar','Betagi','Patharghata','Taltali'],
  'Barishal': ['Agailjhara','Babuganj','Bakerganj','Banaripara','Barishal Sadar','Gaurnadi','Hizla','Mehendiganj','Muladi','Wazirpur'],
  'Bhola': ['Bhola Sadar','Borhanuddin','Char Fasson','Daulatkhan','Lalmohan','Manpura','Tazumuddin'],
  'Bogura': ['Adamdighi','Bogura Sadar','Dhunat','Dupchanchia','Gabtali','Kahaloo','Nandigram','Sariakandi','Shajahanpur','Sherpur','Shibganj','Sonatola'],
  'Brahmanbaria': ['Akhaura','Ashuganj','Bancharampur','Bijoynagar','Brahmanbaria Sadar','Kasba','Nabinagar','Nasirnagar','Sarail'],
  'Chandpur': ['Chandpur Sadar','Faridganj','Haimchar','Haziganj','Kachua','Matlab Dakshin','Matlab Uttar','Shahrasti'],
  'Chapai Nawabganj': ['Bholahat','Chapai Nawabganj Sadar','Gomastapur','Nachole','Shibganj'],
  'Chattogram': ['Akbar Shah','Bakalia','Bandar','Bayazid','Boalkhali','Chandanaish','Chandgaon','Chawkbazar','Doublemooring','EPZ','Halishahar','Hathazari','Karnaphuli','Khulshi','Kotwali','Mirsharai','Pahartali','Panchlaish','Patenga','Patiya','Raozan','Sadarghat','Sitakunda'],
  'Chuadanga': ['Alamdanga','Chuadanga Sadar','Damurhuda','Jibannagar'],
  "Cox's Bazar": ["Cox's Bazar Sadar",'Chakaria','Eidgaon','Kutubdia','Maheshkhali','Pekua','Ramu','Teknaf','Ukhia'],
  'Cumilla': ['Barura','Brahmanpara','Burichang','Chandina','Chauddagram','Cumilla Sadar','Cumilla Sadar South','Daudkandi','Debidwar','Homna','Laksam','Lalmai','Meghna','Monohorganj','Muradnagar','Nangalkot','Titas'],
  'Dhaka': ['Adabor','Badda','Bangshal','Cantonment','Chawkbazar','Dakshinkhan','Darus Salam','Demra','Dhanmondi','Gendaria','Gulshan','Hazaribagh','Jatrabari','Kadamtali','Kafrul','Kalabagan','Kamrangirchar','Keraniganj','Khilgaon','Khilkhet','Kotwali','Lalbagh','Mirpur','Mohammadpur','Motijheel','Mugda','New Market','Pallabi','Paltan','Ramna','Rampura','Sabujbagh','Shah Ali','Shahbagh','Sher-e-Bangla Nagar','Shyampur','Sutrapur','Tejgaon','Tejgaon I/A','Turag','Uttara','Uttarkhan','Vatara','Wari'],
  'Dinajpur': ['Birampur','Birganj','Biral','Bochaganj','Chirirbandar','Dinajpur Sadar','Fulbari','Ghoraghat','Hakimpur','Kaharol','Khansama','Nawabganj','Parbatipur'],
  'Faridpur': ['Alfadanga','Bhanga','Boalmari','Char Bhadrasan','Faridpur Sadar','Madhukhali','Nagarkanda','Sadarpur','Saltha'],
  'Feni': ['Chhagalnaiya','Daganbhuiyan','Feni Sadar','Fulgazi','Parshuram','Sonagazi'],
  'Gaibandha': ['Fulchhari','Gaibandha Sadar','Gobindaganj','Palashbari','Sadullapur','Saghata','Sundarganj'],
  'Gazipur': ['Gazipur Sadar','Kaliakair','Kaliganj','Kapasia','Sreepur','Tongi'],
  'Gopalganj': ['Gopalganj Sadar','Kashiani','Kotalipara','Muksudpur','Tungipara'],
  'Habiganj': ['Ajmiriganj','Baniachong','Bahubal','Chunarughat','Habiganj Sadar','Lakhai','Madhabpur','Nabiganj','Sayestaganj'],
  'Jamalpur': ['Bakshiganj','Dewanganj','Islampur','Jamalpur Sadar','Madarganj','Melandaha','Sarishabari'],
  'Jashore': ['Abhaynagar','Bagherpara','Chaugachha','Jashore Sadar','Jhikargachha','Keshabpur','Manirampur','Sharsha'],
  'Jhalokati': ['Jhalokati Sadar','Kathalia','Nalchity','Rajapur'],
  'Jhenaidah': ['Harinakunda','Jhenaidah Sadar','Kaliganj','Kotchandpur','Maheshpur','Shailkupa'],
  'Joypurhat': ['Akkelpur','Joypurhat Sadar','Kalai','Khetlal','Panchbibi'],
  'Khagrachhari': ['Dighinala','Guimara','Khagrachhari Sadar','Lakshmichhari','Mahalchhari','Manikchhari','Matiranga','Panchhari','Ramgarh'],
  'Khulna': ['Batiaghata','Dacope','Daulatpur','Dighalia','Dumuria','Harintana','Khan Jahan Ali','Khulna Sadar','Koyra','Paikgachha','Phultala','Rupsha','Sonadanga','Terokhada'],
  'Kishoreganj': ['Austagram','Bajitpur','Bhairab','Hossainpur','Itna','Karimganj','Katiadi','Kishoreganj Sadar','Kuliarchar','Mithamain','Nikli','Pakundia','Tarail'],
  'Kurigram': ['Bhurungamari','Chilmari','Fulbari','Kurigram Sadar','Nageshwari','Rajarhat','Rajibpur','Raumari','Ulipur'],
  'Kushtia': ['Bheramara','Daulatpur','Khoksa','Kumarkhali','Kushtia Sadar','Mirpur'],
  'Lakshmipur': ['Kamalnagar','Lakshmipur Sadar','Ramganj','Ramgati','Roypur'],
  'Lalmonirhat': ['Aditmari','Hatibandha','Kaliganj','Lalmonirhat Sadar','Patgram'],
  'Madaripur': ['Kalkini','Madaripur Sadar','Rajoir','Shibchar'],
  'Magura': ['Magura Sadar','Mohammadpur','Shalikha','Sreepur'],
  'Manikganj': ['Daulatpur','Ghior','Harirampur','Manikganj Sadar','Saturia','Shivalaya','Singair'],
  'Meherpur': ['Gangni','Meherpur Sadar','Mujibnagar'],
  'Moulvibazar': ['Barlekha','Juri','Kamalganj','Kulaura','Moulvibazar Sadar','Rajnagar','Sreemangal'],
  'Munshiganj': ['Gazaria','Lohajang','Munshiganj Sadar','Sirajdikhan','Sreenagar','Tongibari'],
  'Mymensingh': ['Bhaluka','Dhobaura','Fulbaria','Gaffargaon','Gauripur','Haluaghat','Ishwarganj','Mymensingh Sadar','Muktagachha','Nandail','Phulpur','Tarakanda','Trishal'],
  'Naogaon': ['Atrai','Badalgachhi','Dhamoirhat','Mahadebpur','Manda','Naogaon Sadar','Niamatpur','Patnitala','Porsha','Raninagar','Sapahar'],
  'Narail': ['Kalia','Lohagara','Narail Sadar'],
  'Narayanganj': ['Araihazar','Bandar','Narayanganj Sadar','Rupganj','Sonargaon'],
  'Narsingdi': ['Belabo','Monohardi','Narsingdi Sadar','Palash','Raipura','Shibpur'],
  'Natore': ['Bagatipara','Baraigram','Gurudaspur','Lalpur','Natore Sadar','Singra'],
  'Netrokona': ['Atpara','Barhatta','Durgapur','Kalmakanda','Kendua','Khaliajuri','Madan','Mohanganj','Netrokona Sadar','Purbadhala'],
  'Nilphamari': ['Dimla','Domar','Jaldhaka','Kishoreganj','Nilphamari Sadar','Saidpur'],
  'Noakhali': ['Begumganj','Chatkhil','Companiganj','Hatiya','Kabirhat','Noakhali Sadar','Senbagh','Sonaimuri','Subarnachar'],
  'Pabna': ['Atgharia','Bera','Bhangura','Chatmohar','Faridpur','Ishwardi','Pabna Sadar','Santhia','Sujanagar'],
  'Panchagarh': ['Atwari','Boda','Debiganj','Panchagarh Sadar','Tetulia'],
  'Patuakhali': ['Bauphal','Dashmina','Dumki','Galachipa','Kalapara','Mirzaganj','Patuakhali Sadar','Rangabali'],
  'Pirojpur': ['Bhandaria','Indurkani','Kawkhali','Mathbaria','Nazirpur','Nesarabad','Pirojpur Sadar','Zianagar'],
  'Rajbari': ['Baliakandi','Goalandaghat','Kalukhali','Pangsha','Rajbari Sadar'],
  'Rajshahi': ['Bagha','Bagmara','Charghat','Durgapur','Godagari','Mohanpur','Paba','Puthia','Rajshahi Sadar','Tanore'],
  'Rangamati': ['Baghaichhari','Barkal','Belaichhari','Juraichhari','Kaptai','Kawkhali','Langadu','Naniarchar','Rajasthali','Rangamati Sadar'],
  'Rangpur': ['Badarganj','Gangachara','Kaunia','Mithapukur','Pirgachha','Pirganj','Rangpur Sadar','Taraganj'],
  'Satkhira': ['Assasuni','Debhata','Kalaroa','Kaliganj','Satkhira Sadar','Shyamnagar','Tala'],
  'Shariatpur': ['Bhedarganj','Damudya','Gosairhat','Jajira','Naria','Shariatpur Sadar'],
  'Sherpur': ['Jhenaigati','Nakla','Nalitabari','Sherpur Sadar','Sreebardi'],
  'Sirajganj': ['Belkuchi','Chauhali','Enayetpur','Kamarkhanda','Kazipur','Raiganj','Shahjadpur','Sirajganj Sadar','Tarash','Ullapara'],
  'Sunamganj': ['Bishwamvarpur','Chhatak','Derai','Dharamapasha','Doarabazar','Jagannathpur','Jamalganj','Sullah','Sunamganj Sadar','Tahirpur'],
  'Sylhet': ['Balaganj','Beanibazar','Bishwanath','Companiganj','Fenchuganj','Golapganj','Gowainghat','Jaintiapur','Kanaighat','Osmani Nagar','Sylhet Sadar','Zakiganj'],
  'Tangail': ['Basail','Bhuapur','Delduar','Dhanbari','Ghatail','Gopalpur','Kalihati','Madhupur','Mirzapur','Nagarpur','Sakhipur','Tangail Sadar'],
  'Thakurgaon': ['Baliadangi','Haripur','Pirganj','Ranisankail','Thakurgaon Sadar'],
}

/** A district's thanas; unknown districts get "<District> Sadar". */
export function getThanas(district: string): string[] {
  return THANAS[district] || [`${district} Sadar`]
}

/**
 * Inside Dhaka = Dhaka district only; every other district (Gazipur and
 * Narayanganj included) is outside. The same rule Dakio charges delivery by.
 */
export const DHAKA_DISTRICTS: readonly string[] = ['Dhaka']

export function deliveryZone(district: string | null | undefined): 'inside_dhaka' | 'outside_dhaka' {
  const d = String(district ?? '').trim().toLowerCase().replace(/\s+district$/, '').replace(/\s*জেলা$/, '')
  return d === 'dhaka' || d === 'ঢাকা' ? 'inside_dhaka' : 'outside_dhaka'
}

/** Find a district and thana named in a free-text address ("House 4, Mirpur 10, Dhaka"). */
export function detectLocation(text: string): { district: string | null; thana: string | null } {
  const lower = String(text || '').toLowerCase()
  let district = DISTRICTS.find((d) => lower.includes(d.toLowerCase())) || null
  let thana: string | null = null
  if (district) {
    thana = getThanas(district).find((t) => lower.includes(t.toLowerCase())) || null
  } else {
    for (const [dist, thanas] of Object.entries(THANAS)) {
      const found = thanas.find((t) => lower.includes(t.toLowerCase()))
      if (found) { district = dist; thana = found; break }
    }
  }
  return { district, thana }
}

const BD_WRITTEN = /^(?:\+?880|0)(1[3-9]\d{8})$/

/** A Bangladesh mobile in any usual spelling: 01712345678, +8801712345678, 8801712345678, with spaces or dashes. */
export function isBdPhone(raw: string | null | undefined): boolean {
  return BD_WRITTEN.test(String(raw ?? '').replace(/[\s\-().]/g, ''))
}

/** → 01XXXXXXXXX, or null when it isn't a Bangladesh mobile. */
export function normalizeBdPhone(raw: string | null | undefined): string | null {
  const m = BD_WRITTEN.exec(String(raw ?? '').replace(/[\s\-().]/g, ''))
  return m ? '0' + m[1] : null
}

/** ৳1,250 — Bangladeshi digit grouping (৳1,25,000), whole taka unless there are paisa. */
export function formatTaka(amount: number, options: { symbol?: string; bangla?: boolean } = {}): string {
  const n = Number(amount) || 0
  const hasPaisa = Math.round(n * 100) % 100 !== 0
  const s = n.toLocaleString(options.bangla ? 'bn-BD' : 'en-IN', { minimumFractionDigits: hasPaisa ? 2 : 0, maximumFractionDigits: 2 })
  return (options.symbol ?? '৳') + s
}
