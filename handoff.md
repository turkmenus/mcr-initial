# MCR (Media Control Room) — Proje Handoff Dokümanı

> **Sürüm:** 1.0 · **Tarih:** 24 Ağustos 2026 · **Durum:** Konsept netleştirildi, PoC öncesi
>
> **Bu dokümanın amacı:** Projeyi devralacak ekibe tam bağlamı aktarmak. Her karar gerekçesiyle yazıldı. Bir konu burada yoksa ve "Açık Sorular" bölümünde de değilse, tahmin yürütmeyin — sorun.

---

## 1. Problem ve Ürün Tanımı

**Problem:** Piyasadaki yayın (broadcast) yazılım paketleri haber odasının ihtiyacına göre şişirilmiş ve gerekçesiz pahalı. Paketin büyük bölümü hiç kullanılmıyor; ihtiyaç duyulan kısmı tek başına sunan bir ürün bulunamadı. **Karar:** Kendi aracımızı geliştiriyoruz.

**Kullanıcılar:** Haber odası çalışanları. Bu bir **dahili araç**tır; genel kullanıcıya açık ticari ürün değildir.

**Platform:** Web uygulaması. Uzun soluklu proje, ancak önce hızlı bir **PoC/MVP** ile konseptin işlediği kanıtlanacak.

**Ürün:** Media Control Room (MCR) — tüm hareketli medya öğelerinin tek kontrol arayüzü. Birbirine benzeyen iki ana yüzeyden oluşur:

1. **Video editör arayüzü**
   - Layer bazlı sürükle-bırak timeline
   - Grafik araçları paneli (lower-third, ticker, news-stinger, bumper, transition) — interaktif
   - Export sayfası
   - **Gerçek video kurgusu kalitesi zorunlu** (kesme/trim dahil; "grafik + arka plan videosu" yeterli değil)

2. **Canlı yayın grafik kontrol arayüzü**
   - Grafik araçları listesi (lower-third, ticker, news-stinger, bumper, transition)
   - Animasyon göster/gizle butonları
   - Broadcast canvas ayarları (çözünürlük, fps)
   - Önceden ayarlanmış boyutlarda **ayrı bir broadcast output penceresi**

---

## 2. Kesin Kararlar

Bu kararlar tartışılarak verildi. Değiştirmek isteyen, gerekçeyi ve etki analizini yazılı olarak sunar.

| # | Karar | Gerekçe |
|---|-------|---------|
| 1 | **Tek template motoru, çok yüzey.** Tüm grafikler (lower-third, ticker, stinger, bumper, transition) tek bir template motoruyla tanımlanır; editör, canlı kontrol ve output aynı tanımı kullanır. | Tutarlılık; tek gerçek kaynak (single source of truth). İki ayrı grafik sistemi = iki kat bakım. |
| 2 | **MCR doğrudan yayın çıkışı üretmez.** Playout, CasparCG Server üzerinden **NDI output** ile yapılır. | CasparCG 2006'dan beri 7/24 yayın ortamında çalışan, savaşmış açık kaynak playout sunucusu. NDI çıkışı config ile açılır; OBS/vMix/Tricaster bunu doğrudan kaynak olarak görür. |
| 3 | **Template formatı = OGraf.** Kendi şema/format icat edilmeyecek. OGraf, EBU'nun açık broadcast grafik standardı; Graphics Definition v1 stabil. MCR'a özgü metadata `x-mcr` uzantı alanlarında yaşar. | Ekosistem hazır: editör, renderer, kontrolör, form üreteci, template koleksiyonu. Bisikleti yeniden icat etmiyoruz. |
| 4 | **Template runtime framework'süz saf JS olacak** (GSAP kullanılabilir). Vue/React template içine giremez. | Template'ler CasparCG'nin gömülü CEF tarayıcısında ve OGraf renderer'larda framework'siz çalışmak zorunda. |
| 5 | **Web uygulaması = Next.js (React).** | Proje sahibi geliştirmeyi kendisi yapmayacak; Vue sadakati gerekmiyor. Referans açık kaynak editörlerin (OpenCut, clip-js) ve Remotion'ın React ekosisteminde olması ciddi hız kazandırır. |
| 6 | **Canlı WebGL harita yok.** Hava durumu haritaları önceden render edilen video segmentleridir. | CasparCG HTML producer'da WebGL desteği sürüme/yapılandırmaya bağlı ve güvenilmez (2.2'de kullanılamaz/laggy raporları var). Canlı yayın grafiğinde "sürüme bağlı çalışır" kabul edilemez. |
| 7 | **Final export sunucuda FFmpeg ile.** Tarayıcıda WebCodecs sadece önizleme ve hızlı taslak export içindir. | "Gerçek kurgu kalitesi" + "esnek format" gereksinimleri ancak orijinal dosyalardan sunucu render'ıyla karşılanır; sıfır jenerasyon kaybı, istenen codec. |
| 8 | **Çoklu operatör senkronu WebSocket hub üzerinden.** Editör tek kişiliktir; realtime collab yok, proje kilidi var. | Canlı ortamda 2-3 operatör farklı makinelerde çalışacak; BroadcastChannel sadece aynı tarayıcı içinde çalışır (PoC'da yeterli, üretimde değil). |
| 9 | **Hava verisi = Open-Meteo.** | API anahtarsız, düz JSON, CC BY 4.0, küresel kapsam (Orta Asya dahil), 1-11 km çözünürlük. Dikkat: ücretsiz katman ticari olmayan kullanım içindir (10.000 çağrı/gün); ticari katman ~€29/ay'dan başlar — bütçeye not edildi. |
| 10 | **Harita motoru = MapLibre GL JS.** | Açık kaynak (Mapbox GL fork'u), API anahtarı gerektirmez, style JSON ile tam stil kontrolü. |

---

## 3. Kapsam Dışı (MVP'de Kesinlikle Yok)

- Çok kullanıcılı eşzamanlı kurgu / Google Docs tarzı collab
- Mobil uygulama
- AI özellikleri (otomatik altyazı, özet vb.)
- Genel kullanıcıya açık kayıt/abonelik sistemi (dahili araç)

---

## 4. Mimari Genel Bakış

```
┌─ apps/web (Next.js) ─────────────────────────┐
│  /editor   → kurgu (tek operatör)            │
│  /control  → canlı grafik tetikleme          │
│  /ticker   → ticker operatörü paneli         │
│  /output   → web renderer (yedek/preview)    │
└──────┬───────────────────────────────────────┘
       │ WebSocket (canlı durum senkronu — tek otorite)
┌──────┴───────────┐      AMCP (CG ADD/PLAY/UPDATE/STOP)
│ apps/realtime    │──────────────┐
│ (WS hub)         │              ▼
└──────────────────┘      ┌────────────────┐   NDI    ┌──────────────┐
                          │ CasparCG Server │────────▶│ OBS / vMix / │
                          │ (HTML producer) │         │ Tricaster    │
┌──────────────────┐      └────────────────┘          └──────────────┘
│ apps/renderer    │  timeline JSON + orijinal medya → FFmpeg → preset'ler
│ (Remotion+FFmpeg)│  veri odaklı segmentler (hava durumu) → Remotion
└──────────────────┘
```

**Veri akışı (canlı):** Kontrol paneli → WS hub → CasparCG connector → AMCP → CasparCG Server → NDI → yayın switcher'ı.

**Veri akışı (export):** Editör timeline JSON (EDL mantığında) → render kuyruğu (Redis) → renderer worker → FFmpeg → preset'e göre MP4/MOV.

**Veri akışı (hava durumu):** Operatör paneli → Open-Meteo verisi (PostgreSQL'de cache) → Remotion kompozisyonu → video segment → rundown'a klip.

---

## 5. Teknoloji Yığını

| Katman | Seçim | Not |
|---|---|---|
| Web uygulaması | **Next.js (React)** | Tüm UI yüzeyleri tek app'te: /editor /control /ticker /output |
| Template runtime | Saf JS + GSAP | Karar 4 — framework'süz, CasparCG/OGraf uyumlu |
| Template formatı | **OGraf Graphics Definition v1** + `x-mcr` uzantıları | EBU standardı; spec.ograf.dev |
| Realtime | WebSocket hub (Node) | PoC'da BroadcastChannel ile başlanabilir, üretimde WS |
| Tarayıcı önizleme/taslak export | WebCodecs + Mediabunny (muxer) | MediaRecorder + ffmpeg.wasm hattına göre ~10× hızlı; MediaRecorder yalnızca anlık önizleme |
| Final export | FFmpeg (sunucu, kuyruk tüketicisi) | Orijinal medyadan render — jenerasyon kaybı yok |
| Veri odaklı segmentler | **Remotion** (renderer paketi içinde) | React bağımlılığı yalnızca bu pakette kabul edildi |
| CasparCG bağlantısı | `casparcg-connection` (Node/TS, AMCP) | Sofie TV otomasyonunun da parçası olan savaşmış kütüphane |
| Veritabanı | PostgreSQL | Projeler, template metadata, rundown, ticker içeriği, hava verisi cache |
| Kuyruk | Redis | Render işleri |
| Harita | MapLibre GL JS + @turf/turf | Stil: style JSON; kamera yolları: turf |
| Hava verisi | Open-Meteo | Karar 9'daki lisans notuna dikkat |
| Kontrol formları | `ograf-form` Web Component | OGraf/GDD şemasından otomatik input formu üretir; React içinde çalışır |
| Altyapı | Docker (docker-compose: postgres + redis + casparcg) | Geliştirme ortamı tek komutla ayağa kalkmalı |

---

## 6. OGraf Ekosistemi: Alınanlar vs. İnşa Edilenler

**Hazır alınacaklar (sıfırdan yazılmayacak):**

| Araç | Kullanım | Kaynak |
|---|---|---|
| OGraf Specification | Template formatının temeli | spec.ograf.dev (EBU standardı, Graphics Definition v1 stabil; Server/Control API henüz **taslak**) |
| ograf-form | Kontrol panelindeki otomatik formlar | github.com/Eyevinn/ograf-form |
| ograf-graphics | İlk lower-third/ticker template'leri — fork'lanıp markalanacak | github.com/SmartMediaProductions/ograf-graphics |
| Eyevinn ograf-editor | Editör UI referansı (drag-and-drop + kod + animasyon) | github.com/Eyevinn/ograf-editor |
| Ferryman | After Effects / Lottie → HTML broadcast template dönüştürücü | github.com/SmartMediaProductions/Ferryman |
| SPX-GC | MCR kontrol yüzeyi hazır olana dek **geçici kontrolör**; sonrasında referans | github.com/TuomoKu/SPX-GC (v1.4'te OGraf uyumu) |
| SuperConductor | Alternatif/geçici playout kontrolü (CasparCG, ATEM, OBS, vMix) | github.com/SuperFlyTV/SuperConductor |
| ograf-server | Test renderer'ı | github.com/ograf-project/ograf-server |
| gstcefsrc | CasparCG'siz HTML → SDI/NDI/dosya alternatifi | github.com/Sparkle-AV/gstcefsrc |

**MCR'ın inşa edeceği (ürünün asıl değeri):**

- Tek çatı: editör + canlı kontrol + ticker + rundown birleşimi
- Çoklu operatör realtime senkronu (WS hub)
- Timeline editörü (gerçek kurgu)
- Render worker (FFmpeg export + Remotion hava durumu segmentleri)
- CasparCG orkestrasyonu ve haber odası veri entegrasyonları (PostgreSQL, n8n webhook'ları)

**Önemli:** OGraf Server/Control API henüz taslak olduğundan, MCR kendi WS protokolünü kullanır; OGraf uyumu **template seviyesinde** sağlanır. API stabil olduğunda geçiş değerlendirilir (bkz. Açık Sorular).

---

## 7. Template Modeli

Temel alanlar OGraf Graphics Definition v1'e göre tanımlanır (spec'e bakın). MCR'a özgü metadata `x-mcr` bloğunda yaşar:

```json
{
  "$schema": "ograf/graphics-definition@1",
  "id": "lower-third.standard",
  "version": "1.0.0",
  "name": "Standart Alt Bant",
  "category": "lower-third",
  "render": {
    "type": "html",
    "entry": "index.html",
    "canvas": { "width": 1920, "height": 1080 },
    "responsive": true
  },
  "data": {
    "fields": {
      "title":    { "type": "string", "label": "İsim",  "maxLength": 48 },
      "subtitle": { "type": "string", "label": "Ünvan", "maxLength": 64 },
      "accent":   { "type": "color",  "label": "Renk",  "default": "#C8102E" }
    }
  },
  "states": {
    "in":     { "duration": 0.6 },
    "out":    { "duration": 0.4 },
    "next":   { "duration": 0.3 },
    "update": { "duration": 0.3 }
  },
  "x-mcr": {
    "playout": {
      "casparcg": { "channel": 1, "layer": 20, "cgLayer": 10 },
      "web":      { "route": "/output", "zIndex": 20 }
    },
    "editor": { "defaultDuration": 5, "trackType": "graphics", "resizable": true }
  }
}
```

**Durum modeli ↔ CasparCG eşlemesi (birebir):** `in → play()`, `out → stop()`, `next → next()`, `update → update(data)`. CasparCG HTML producer bu global fonksiyonları çağırır; bu yüzden her template bu dört fonksiyonu tanımlamak zorundadır.

**Ticker varyantı** ek olarak şunları tanımlar: `"behavior": { "mode": "loop", "speed": 120 }` ve veri alanında `"binding": "manual"` (ileride `"rss"` veya n8n webhook'u).

**Hava durumu varyantı** `render.type: "remotion"` kullanır (bkz. Bölüm 9).

---

## 8. CasparCG Entegrasyonu

- **Protokol:** AMCP. Node tarafında `casparcg-connection` kütüphanesi kullanılır.
- **HTML producer kuralları:** Her template global `play()`, `stop()`, `next()`, `update(data)` fonksiyonlarını tanımlar. `update()` veriyi string (JSON veya XML) alır — MCR **JSON'da standardize** eder.
- **Örnek AMCP akışı:**

```
CG 1-20 ADD 10 "lower-third.standard" 1 "{\"title\":\"Ahmet Yılmaz\",\"subtitle\":\"Muhabir\"}"
CG 1-20 PLAY 10
CG 1-20 UPDATE 10 "{\"title\":\"Yeni İsim\"}"
CG 1-20 STOP 10
```

- **NDI çıkışı** `casparcg.config` içinde consumer olarak tanımlanır:

```xml
<channel>
  <video-mode>1080i5000</video-mode>
  <consumers>
    <ndi><name>MCR_Main</name></ndi>
  </consumers>
</channel>
```

Bu tanımla kanal ağda NDI kaynağı olarak görünür; OBS/vMix/Tricaster doğrudan seçebilir.

- **Bilinen risk:** HTML producer'ın CEF sürümüne göre WebGL ve bazı modern CSS/JS özellikleri kısıtlı olabilir. Template geliştirirken hedef CasparCG sürümünde test zorunlu. WebGL'e bağımlı hiçbir şey canlı grafiğe giremez (Karar 6).

---

## 9. Hava Durumu Modülü

**Karar:** Hava durumu haritası canlı render edilmez; **önceden üretilen video segmenti** olarak yayına girer (Yol A). Gerekçe: CasparCG CEF'inde WebGL güvenilmez + hava segmenti saniye kritik değildir, bülten öncesi/saat başı güncellenir.

**Yol B (yedek, ileride):** Canlıda harita gerekirse WebGL'siz SVG/Canvas2D sade harita template'i (statik katmanlar + GSAP; radar animasyonu yok).

**Render deseni (Remotion):**
- MapLibre GL JS + `@turf/turf` (kamera yolları, jeo-hesaplama)
- Deterministik render kuralları: (1) map'in native animasyonları kapalı, (2) kamera `useCurrentFrame()` ile frame-frame sürülür, (3) tile'lar yüklenene kadar `useDelayRender` ile kare bekletilir. Bu üç kural atlanırsa frame senkron hataları kaçınılmaz.

**Veri:** Open-Meteo API (anahtarsız JSON). Veri PostgreSQL'de cache'lenir; "veriyi yenile + yeniden render" tek tuş.

**Stil:** MapLibre style JSON ile tam marka kontrolü (renkler, fontlar, koyu yayın teması). Türkmenistan vilayet sınırları için özel GeoJSON; şehir etiketleri çok dilli (Türkmençe/Türkçe/Rusça). Tile kaynağı: OSM veya self-hosted (bkz. Açık Sorular).

**Template tanımı örneği:**

```json
{
  "id": "weather-map.national",
  "category": "weather-map",
  "render": { "type": "remotion", "composition": "WeatherMap", "fps": 50 },
  "data": {
    "binding": "open-meteo",
    "locations": ["Aşkabat", "Türkmenabat", "Daşoguz", "Mary", "Balkanabat"],
    "layers": ["temperature", "precipitation", "wind"]
  },
  "x-mcr": {
    "map": { "style": "styles/mcr-broadcast-dark.json", "camera": { "preset": "national-tour", "duration": 18 } },
    "output": { "preset": "broadcast-16:9", "format": "clip" }
  }
}
```

**Operatör akışı:** Hava panelini aç → konum/stil seç (veya kayıtlı preset) → "üret" → segment rundown'a klip olarak düşer. Editörde bu segment sıradan klip gibi kesilebilir; üzerine mevcut template motorundan lower-third binebilir.

---

## 10. Editör ve Export

**Editör:**
- Layer bazlı timeline, sürükle-bırak, kesme/trim, geçişler
- Tarayıcıda önizleme: WebCodecs decode → canvas kompozit (frame-accurate)
- Timeline'ın kendisi JSON (EDL mantığında) olarak saklanır — final render bu JSON + orijinal medyadan yapılır
- Tek kişilik işlem: realtime collab yok, proje kilidi var

**Export hattı:**
- Hızlı taslak: tarayıcıda WebCodecs encode + Mediabunny muxer → MP4
- Anlık önizleme kaydı: MediaRecorder (yalnızca demo/proxy)
- Final: sunucuda FFmpeg (render worker, Redis kuyruğu tüketicisi)

**Export preset'leri:**

| Preset | Boyut | Codec/fps | Hedef |
|---|---|---|---|
| broadcast-16:9 | 1920×1080 | ProRes / H.264, 25/50fps | Yayın, arşiv master |
| web-16:9 | 1920×1080 | H.264 | YouTube, site |
| vertical-9:16 | 1080×1920 | H.264, 30fps | Reels, TikTok, Shorts |
| square-1:1 | 1080×1080 | H.264 | Instagram feed |
| feed-4:5 | 1080×1350 | H.264 | Instagram, X |

Preset listesi `packages/presets` içinde genişletilebilir.

---

## 11. Operatör Modeli ve Realtime

**Roller (canlı yayın, 2-3 operatör, farklı makineler):**
- **Grafik operatörü:** /control — lower-third, stinger, bumper tetikleme
- **Ticker operatörü:** /ticker — ticker içeriğini manuel girer/düzenler (aynı yayın ortamında, ayrı kişi)
- **Editör:** /editor — tek kişilik kurgu; yayın anında realtime'a karışmaz

**Kurallar:**
- WS hub canlı durumun **tek otoritesi**dir (aktif grafikler, rundown, ticker içeriği)
- PoC'da tek makine senaryosu için BroadcastChannel yeterli; üretimde WS zorunlu
- Ticker verisi manuel giriştir; ileride RSS/n8n binding'i şema seviyesinde hazır

---

## 12. Klasör Yapısı

```
mcr/
├─ apps/
│  ├─ web/                  # Next.js — /editor /control /ticker /output
│  ├─ realtime/             # WS hub — operatörler arası durum otoritesi
│  └─ renderer/             # FFmpeg export worker + Remotion segment render
├─ packages/
│  ├─ schema/               # OGraf spec tipleri + x-mcr uzantıları, proje/timeline şemaları
│  ├─ engine/               # saf JS template runtime (play/stop/next/update + GSAP)
│  ├─ timeline/             # kurgu veri modeli (EDL) + canvas renderer
│  ├─ casparcg/             # casparcg-connection sarmalayıcı, komut kuyruğu
│  ├─ maps/                 # MapLibre stilleri, GeoJSON sınırlar, kamera preset'leri
│  └─ presets/              # export profilleri (Bölüm 10'daki tablo)
├─ templates/               # template paketleri (ograf-graphics fork'ları + özgünler)
│  ├─ lower-third.standard/ # template.json + index.html + assets
│  └─ ticker.headline/
├─ infra/
│  ├─ docker-compose.yml    # postgres + redis + casparcg
│  └─ casparcg.config       # NDI consumer ayarlı örnek config
└─ package.json             # pnpm workspace
```

---

## 13. Yol Haritası

| Faz | Kapsam | Kabul kriteri |
|---|---|---|
| **0 — PoC (~2-3 hf)** | OGraf lower-third fork + engine + /control + /output + CasparCG bağlantısı. Opsiyonel: tek frame Remotion hello-world. | Kontrol panelinden IN/OUT tetiklenen grafik, CasparCG NDI çıkışında OBS/vMix'te görünür. |
| **1 — Canlı ekip** | WS hub, ticker paneli (manuel giriş), PostgreSQL rundown | 2-3 operatör farklı makinelerden eşzamanlı çalışır; ticker operatörü bağımsız içerik girer. |
| **2 — Editör** | WebCodecs decode, kesme/trim, geçişler, layer timeline, timeline JSON | Gerçek footage ile kurgu + frame-accurate önizleme. |
| **3 — Render worker** | FFmpeg kuyruk + export preset'leri + Remotion hava segmenti | broadcast-16:9 ve vertical-9:16 export çalışır; Open-Meteo verili ~20 sn hava segmenti rundown'a klip olarak düşer. |
| **4 — Sertleştirme** | NDI production testleri, hata toleransı, OGraf Server/Control API takibi | Yayın ortamında kesintisiz test yayını. |

**Paralellik notu:** Editör (Faz 2) realtime'a bağımlı olmadığından Faz 1 ile paralel yürütülebilir.

---

## 14. Riskler

| Risk | Etki | Azaltma |
|---|---|---|
| CasparCG CEF sürümüne göre WebGL/modern API kısıtı | Canlı grafiklerde render hatası | WebGL canlıda yasak (Karar 6); template'ler hedef sürümde test edilir |
| Open-Meteo ücretsiz katmanı ticari kullanım dışı | Lisans ihlali | Ticari katman ~€29/ay bütçelendi; alternatif: self-hosted Open-Meteo (açık kaynak) |
| OGraf Server/Control API taslak | Standart değişebilir | Uyum template seviyesinde; kendi WS protokolümüz bağımsız |
| Remotion yalnızca React | Renderer paketinde React bağımlılığı | Kabul edildi; UI'dan izole |
| Tek kişilik PoC ekibi / zaman baskısı | Kapsam şişmesi | Faz 0 kabul kriteri dar tutuldu; "kapsam dışı" listesine sadakat |

---

## 15. Açık Sorular

1. **Tile kaynağı:** OSM mi, self-hosted tile sunucusu mu? (Bağımsızlık vs. bakım maliyeti — Türkmenistan kapsama kalitesi kontrol edilmeli)
2. **Ses kapsamı:** Editörde ses track'i/miksaj ne düzeyde? (MVP'de passthrough mu, basit seviye kontrolü mü?)
3. **Kimlik doğrulama:** Haber odası içi basit auth mu, mevcut dizin/LDAP entegrasyonu mu?
4. **CasparCG donanımı:** Mevcut bir CasparCG sunucusu var mı, yoksa kurulacak mı? Hangi sürüm? (Template test hedefi buna göre sabitlenir)
5. **OGraf Server/Control API** stabil olduğunda MCR WS protokolünden geçiş yapılacak mı?

---

## 16. Referanslar

- OGraf: https://ograf.dev · Spec: https://spec.ograf.dev · Ekosistem: https://ograf.dev/ecosystem
- SPX-GC: https://github.com/TuomoKu/SPX-GC
- casparcg-connection: https://github.com/SuperFlyTV/casparcg-connection
- CasparCG Server: https://github.com/CasparCG/server
- SuperConductor: https://github.com/SuperFlyTV/SuperConductor
- ograf-editor (Eyevinn): https://github.com/Eyevinn/ograf-editor
- ograf-form: https://github.com/Eyevinn/ograf-form
- ograf-graphics: https://github.com/SmartMediaProductions/ograf-graphics
- Ferryman: https://github.com/SmartMediaProductions/Ferryman
- ograf-server: https://github.com/ograf-project/ograf-server
- gstcefsrc: https://github.com/Sparkle-AV/gstcefsrc
- Open-Meteo: https://open-meteo.com (GitHub: https://github.com/open-meteo/open-meteo)
- MapLibre GL JS: https://maplibre.org
- Remotion: https://remotion.dev
- OpenCut (editör referansı): https://github.com/OpenCut-app/OpenCut
- clip-js (Next.js+Remotion editör referansı): https://github.com/mohyware/clip-js

---

## 17. Sözlük

- **AMCP:** CasparCG'nin kontrol protokolü (TCP, metin tabanlı komutlar)
- **Bumper:** Program arası kısa tanıtım animasyonu
- **CEF:** Chromium Embedded Framework — CasparCG'nin HTML template'leri çalıştırdığı gömülü tarayıcı
- **CG (Character Generator):** Yayın grafiği üretici; CasparCG komutlarında `CG` öneki grafik katmanını işaret eder
- **EDL (Edit Decision List):** Kurgu kararlarının listesi; MCR'da timeline JSON bu mantıktadır
- **Lower-third:** Ekranın alt üçte birindeki isim/ünvan bandı
- **NDI:** Network Device Interface — ağ üzerinden video taşıma standardı
- **News-stinger:** Haber geçişlerindeki kısa sesli/görselli animasyon
- **OGraf:** EBU'nun açık broadcast grafik formatı standardı
- **Playout:** Yayın çıkışının üretilmesi/oynatılması
- **Rundown:** Bülten akış sırası (hangi öğe ne zaman yayına girer)
- **Ticker:** Ekran altında akan haber bandı
