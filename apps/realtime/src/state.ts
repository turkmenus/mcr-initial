import {
  ActiveCGLayer,
  RundownItem,
  TickerState,
  OperatorPresence,
} from "@mcr/schema";

export interface StudioState {
  activeCgLayers: Record<string, ActiveCGLayer>;
  rundown: RundownItem[];
  tickerState: TickerState;
  operators: Record<string, OperatorPresence>;
  casparStatus: "CONNECTED" | "DISCONNECTED" | "MOCK";
  amcpLogs: Array<{ timestamp: number; command: string; direction: "IN" | "OUT" }>;
}

export const initialStudioState: StudioState = {
  activeCgLayers: {},
  rundown: [
    {
      id: "cue_1",
      order: 1,
      title: "Ahmet Yılmaz - Ana Haber Bülteni",
      category: "LOWER-THIRD",
      templateId: "lower-third.standard",
      channel: 1,
      layer: 20,
      cgLayer: 10,
      data: {
        title: "Ahmet Yılmaz",
        subtitle: "Haber Spikeri • Canlı Yayın",
        category: "ANA HABER",
        accent: "#C8102E",
      },
      duration: 6,
      autoOut: true,
      notes: "Bülten açılış anonsunda girilecek",
      status: "READY",
    },
    {
      id: "cue_2",
      order: 2,
      title: "Son Dakika Stinger",
      category: "STINGER",
      templateId: "breaking-news.stinger",
      channel: 1,
      layer: 30,
      cgLayer: 5,
      data: {
        title: "FLAŞ HABER GELİŞMESİ",
        subtitle: "AŞKABAT - ANLAŞMA METNİ İMZALANDI",
        accent: "#EF4444",
      },
      duration: 3.5,
      autoOut: true,
      notes: "Önemli haber geçişi",
      status: "READY",
    },
    {
      id: "cue_3",
      order: 3,
      title: "AHL vs KOP - Skor Tablosu",
      category: "SCORE-BUG",
      templateId: "score-bug.sports",
      channel: 1,
      layer: 20,
      cgLayer: 15,
      data: {
        teamA: "AHL",
        scoreA: 2,
        teamB: "KOP",
        scoreB: 1,
        matchTime: "74:20",
        period: "2. DEVRE",
      },
      duration: 10,
      autoOut: false,
      notes: "Spor bülteni özeti",
      status: "READY",
    },
    {
      id: "cue_4",
      order: 4,
      title: "Aşkabat Hava Durumu Kartı",
      category: "WEATHER-CARD",
      templateId: "weather-card.info",
      channel: 1,
      layer: 20,
      cgLayer: 12,
      data: {
        city: "AŞKABAT",
        temp: "32°C",
        condition: "Güneşli ve Açık",
        humidity: "%28",
        wind: "14 km/s KB",
      },
      duration: 8,
      autoOut: true,
      notes: "Meteoroloji bülteni",
      status: "READY",
    },
  ],
  tickerState: {
    active: true,
    speed: 120,
    separator: " • ",
    items: [
      {
        id: "t_1",
        text: "MCR Yayın Otomasyon Sistemi test yayını başarıyla aktif edildi.",
        category: "SON DAKİKA",
        urgent: true,
        enabled: true,
        order: 1,
      },
      {
        id: "t_2",
        text: "Hazar Denizi kıyısında yeni enerji ve lojistik koridoru anlaşması imzalandı.",
        category: "GÜNDEM",
        urgent: false,
        enabled: true,
        order: 2,
      },
      {
        id: "t_3",
        text: "Meteoroloji: Aşkabat ve çevresinde hafta boyunca mevsim normalleri bekleniyor.",
        category: "HAVA",
        urgent: false,
        enabled: true,
        order: 3,
      },
    ],
  },
  operators: {},
  casparStatus: "MOCK",
  amcpLogs: [],
};
