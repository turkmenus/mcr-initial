export interface SampleMediaItem {
  id: string;
  name: string;
  type: "video" | "audio" | "image" | "graphics" | "text";
  duration: number;
  thumbnailUrl?: string;
  src?: string;
  category: string;
  color?: string;
  description: string;
  defaultData?: any;
}

export const SAMPLE_STOCK_MEDIA: SampleMediaItem[] = [
  {
    id: "stock_v_studio",
    name: "Ana Haber Stüdyosu (Canlı)",
    type: "video",
    duration: 15,
    category: "Stüdyo",
    color: "#0284C7",
    description: "Haber Stüdyosu ana sunucu ve canlı yayın açısı",
    src: "/media/studio_anchor.mp4",
  },
  {
    id: "stock_v_broll_city",
    name: "Şehir & Trafik B-Roll",
    type: "video",
    duration: 18,
    category: "B-Roll",
    color: "#0EA5E9",
    description: "Yoğun şehir trafiği ve gündem b-roll",
    src: "/media/breaking_broll.mp4",
  },
  {
    id: "stock_v_breaking",
    name: "Son Dakika Stinger & Arka Plan",
    type: "video",
    duration: 10,
    category: "Grafik Video",
    color: "#DC2626",
    description: "Kırmızı dinamik hareketli haber arka planı",
    src: "/media/studio_anchor.mp4",
  },
  {
    id: "stock_v_weather",
    name: "Meteoroloji Uydu Animasyonu",
    type: "video",
    duration: 12,
    category: "Hava Durumu",
    color: "#059669",
    description: "Bölgesel bulut ve sıcaklık radar döngüsü",
    src: "/media/breaking_broll.mp4",
  },
  {
    id: "stock_a_jingle",
    name: "Ana Haber Açılış Jingle & Müzik",
    type: "audio",
    duration: 10,
    category: "Müzik",
    color: "#10B981",
    description: "Dramatik açılış jingle teması",
    src: "/media/broadcast_jingle.mp3",
  },
  {
    id: "stock_a_voiceover",
    name: "Muhabir Seslendirme (VO)",
    type: "audio",
    duration: 20,
    category: "Ses / Röportaj",
    color: "#34D399",
    description: "Canlı bağlantı muhabir konuşma kaydı",
    src: "/media/reporter_voice.mp3",
  },
  {
    id: "stock_a_breaking_hit",
    name: "Son Dakika Boom & Stinger FX",
    type: "audio",
    duration: 4,
    category: "Ses Efekti",
    color: "#F59E0B",
    description: "Yüksek enerjili geçiş ve haber vurgu sesi",
    src: "/media/broadcast_jingle.mp3",
  },
];

export const STOCK_OGRAF_TEMPLATES = [
  {
    templateId: "lower-third.standard",
    name: "Standart Alt Bant",
    category: "Alt Bant",
    color: "#DC2626",
    duration: 6,
    defaultData: {
      title: "Ahmet Yılmaz",
      subtitle: "Dış Politika Uzmanı • Canlı",
      category: "RÖPORTAJ",
      accent: "#C8102E",
    },
  },
  {
    templateId: "breaking-news.stinger",
    name: "Son Dakika Stinger",
    category: "Stinger",
    color: "#EF4444",
    duration: 5,
    defaultData: {
      title: "SON DAKİKA",
      subtitle: "Bölgedeki son gelişmeler canlı yayında",
      category: "SICAK GELİŞME",
      accent: "#DC2626",
    },
  },
  {
    templateId: "ticker.finance",
    name: "Finans & Borsa Bandı",
    category: "Ticker",
    color: "#059669",
    duration: 10,
    defaultData: {
      title: "BIST 100: +1.4% • USD/TRY: 36.42 • EUR/USD: 1.082 • ALTIN: 3.120 TL",
      subtitle: "Piyasalar",
      category: "EKONOMİ",
      accent: "#10B981",
    },
  },
  {
    templateId: "weather-card.info",
    name: "Hava Durumu Kartı",
    category: "Hava Durumu",
    color: "#0284C7",
    duration: 8,
    defaultData: {
      title: "Aşkabat: 32°C Güneşli",
      subtitle: "Nem: %24 • Rüzgar: 14 km/s KB",
      category: "HAVA DURUMU",
      accent: "#0284C7",
    },
  },
  {
    templateId: "score-bug.sports",
    name: "Spor Skor Tablosu",
    category: "Spor",
    color: "#7C3AED",
    duration: 8,
    defaultData: {
      title: "KÖPETDAĞ 2 - 1 AHAL",
      subtitle: "Türkmenistan Süper Ligi • 78' DK",
      category: "CANLI SKOR",
      accent: "#7C3AED",
    },
  },
];

export const STOCK_TEXT_PRESETS = [
  {
    id: "text_headline",
    name: "Büyük Haber Manşeti",
    text: "TÜRKİYE & BÖLGE GÜNDEMİ",
    fontSize: 56,
    fontWeight: "bold",
    textColor: "#FFFFFF",
    backgroundColor: "rgba(10, 15, 29, 0.9)",
    textAlign: "center" as const,
    duration: 5,
  },
  {
    id: "text_breaking",
    name: "Kırmızı Son Dakika Bandı",
    text: "SON DAKİKA: KRİTİK GÖRÜŞME BAŞLADI",
    fontSize: 44,
    fontWeight: "800",
    textColor: "#FFFFFF",
    backgroundColor: "rgba(200, 16, 46, 0.95)",
    textAlign: "left" as const,
    duration: 6,
  },
  {
    id: "text_subtitle",
    name: "Minimal Alt Açıklama",
    text: "Detaylar bültenimizin devamında ekranlara gelecek",
    fontSize: 32,
    fontWeight: "500",
    textColor: "#E2E8F0",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    textAlign: "center" as const,
    duration: 4,
  },
];
