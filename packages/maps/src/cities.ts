export interface CityMeta {
  id: string;
  name: string;
  nameTk: string;
  nameRu: string;
  lat: number;
  lon: number;
  country: string;
  province?: string;
}

export const BROADCAST_CITIES: CityMeta[] = [
  {
    id: "ashgabat",
    name: "Aşkabat",
    nameTk: "Aşgabat",
    nameRu: "Ашхабад",
    lat: 37.95,
    lon: 58.3833,
    country: "Türkmenistan",
    province: "Ahal",
  },
  {
    id: "turkmenabat",
    name: "Türkmenabat",
    nameTk: "Türkmenabat",
    nameRu: "Туркменабад",
    lat: 39.0833,
    lon: 63.5667,
    country: "Türkmenistan",
    province: "Lebap",
  },
  {
    id: "dashoguz",
    name: "Daşoguz",
    nameTk: "Daşoguz",
    nameRu: "Дашогуз",
    lat: 41.8333,
    lon: 59.9667,
    country: "Türkmenistan",
    province: "Daşoguz",
  },
  {
    id: "mary",
    name: "Mary",
    nameTk: "Mary",
    nameRu: "Мары",
    lat: 37.6,
    lon: 61.8333,
    country: "Türkmenistan",
    province: "Mary",
  },
  {
    id: "balkanabat",
    name: "Balkanabat",
    nameTk: "Balkanabat",
    nameRu: "Балканабад",
    lat: 39.5167,
    lon: 54.3667,
    country: "Türkmenistan",
    province: "Balkan",
  },
  {
    id: "turkmenbashi",
    name: "Türkmenbaşı",
    nameTk: "Türkmenbaşy",
    nameRu: "Туркменбашы",
    lat: 40.0167,
    lon: 52.9667,
    country: "Türkmenistan",
    province: "Balkan",
  },
];

export const getCityById = (id: string): CityMeta | undefined =>
  BROADCAST_CITIES.find(c => c.id.toLowerCase() === id.toLowerCase() || c.name.toLowerCase() === id.toLowerCase());
