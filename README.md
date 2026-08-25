# Media Control Room (MCR) — Haber Odası Yayın ve Kurgu Otomasyonu

**MCR (Media Control Room)**; EBU **OGraf Graphics Definition v1** standartlarına uyumlu canlı yayın grafikleri, bülten akış yönetimi (Rundown), katmanlı video kurgu editörü (NLE), medya varlık yönetimi (MAM), meteoroloji video üretimi ve CasparCG / OBS / vMix playout entegrasyonunu tek çatı altında birleştiren açık kaynaklı bir yayın otomasyon stüdyosudur.

---

## 📺 Temel Özellikler

* **Canlı Grafik Kontrol Paneli (`/control`):**
  * 11 adet standart OGraf şablonu (Alt Bant, Sosyal Medya, Alıntı, Finans Ticker, Skor Tablosu, Stinger, Yan Panel vb.).
  * Şablon veri şemasına göre anında üretilen **Dinamik Giriş Formları**.
  * EBU Action Safe (%5) ve Title Safe (%10) kılavuz çizgili **1080p Canlı Önizleme Monitörü**.
  * Milisaniyelik gecikmeli **CasparCG AMCP Protokol Konsolu**.
  * Otomatik süre sayacına (`Auto-Out`) ve `TAKE` tetikleyicilerine sahip **Bülten Akışı (Rundown)**.
* **Yayın Switcher Paneli (OBS Studio / vMix / NDI):**
  * PGM ve PVW veri yolları (`CAM 1`, `CAM 2`, `VTR 1`, `GFX 1`).
  * `CUT`, `AUTO (1.0s Fade)` ve `STINGER TRANSITION` geçiş tetikleyicileri.
* **Haber Bandı (Ticker) Operatörü (`/ticker`):**
  * Ana kumandadan bağımsız çalışan operatör konsolu.
  * Acil durumlar için **Flaş Haber Modu** ve 60–240 px/s dinamik kayma hızı ayarı.
* **Katmanlı Video Kurgu Editörü (`/editor`):**
  * `G1` (Grafik), `V1` (Video), `A1` (Ses) multi-track EDL timeline mimarisi.
  * Oynatma kafasında klip dilimleme (`C` - Slice), süre kırpma (Trim) ve SMPTE Timecode (`HH:MM:SS:FF` @ 50fps).
  * Video üzerine doğrudan OGraf alt bant ve stinger grafiği bindirme.
  * Tek tuşla sunucu tarafında **FFmpeg 1080p50 Master Render** alma.
* **Medya Varlık Yönetimi (MAM):**
  * Sürükle-bırak video/ses yükleme (`/api/media/upload`).
  * `ffprobe` ile çözünürlük, kare hızı, süre ve ses örnekleme hızı analizi.
  * `ffmpeg` ile otomatik küçük resim (thumbnail) üretimi ve HTTP Range video akışı.
* **Meteoroloji Stüdyosu (`/weather`):**
  * Open-Meteo canlı API entegrasyonu (Türkmenistan vilayetleri ve dünya şehirleri).
  * MapLibre GL koyu tema yayın haritası ve kamera turu.
  * FFmpeg motoru ile 15 saniyelik broadcast 1080p50 hava durumu video klibi render etme.
* **Şeffaf Çıkış Penceresi (`/output`):**
  * OBS Browser Source, vMix ve CasparCG HTML Producer için çerçevesiz 1080p render yüzeyi.

---

## 🏛️ Mimari ve Proje Yapısı

```
mcr/
├─ apps/
│  ├─ web/                  # Next.js 15 (React 19, Tailwind, Shadcn UI) Stüdyo Arayüzü (Port 3000)
│  ├─ realtime/             # WebSocket State Hub + CasparCG AMCP Gateway + Switcher Bridge (Port 4001)
│  └─ renderer/             # FFmpeg 6.1.1 Render Worker + MAM ffprobe & Video API (Port 4002)
├─ packages/
│  ├─ db/                   # ACID Uyumlu Kalıcı Veritabanı & State Motoru (Projects, Rundown, Ticker, MAM)
│  ├─ schema/               # OGraf v1 + x-mcr, Timeline EDL, AMCP ve WS Zod Şemaları
│  ├─ templates/            # 11 Adet Standart EBU Yayın Grafiği Şablon Kaydı ve Tipleri
│  ├─ engine/               # Saf JS + GSAP Template Runtime Köprüsü ve İframe Sandbox
│  ├─ timeline/             # SMPTE Timecode (50fps), Klip Kesme/Bölme, Aktif Kare Çözücü
│  ├─ casparcg/             # AMCP Protokol Oluşturucu/Ayrıştırıcı, TCP Client, Otomatik Mock Server
│  ├─ presets/              # Broadcast 16:9, Social 9:16, 1:1 Square FFmpeg Export Profilleri
│  └─ maps/                 # Türkmenistan Vilayet Şehirleri, MapLibre Teması, Kamera Preset'leri
├─ templates/               # OGraf Standart HTML5 + GSAP Şablon Koleksiyonu (1080p50)
├─ infra/
│  ├─ docker-compose.yml    # PostgreSQL 16 + Redis 7 + CasparCG Server 2.4 (NDI) Konfigürasyonu
│  └─ casparcg.config       # 1080p50 NDI Consumer Ayarlı Örnek Konfigürasyon
└─ package.json             # pnpm monorepo workspace
```

---

## ⚡ Gereksinimler

1. **Node.js:** `v20.0.0` veya üzeri
2. **Paket Yöneticisi:** `pnpm` (v9 veya v11)
3. **Medya Motoru:** `ffmpeg` ve `ffprobe` (Sistemde kurulu olmalıdır)
4. **Konteyner Motoru (Opsiyonel):** `docker` ve `docker compose` (PostgreSQL, Redis ve CasparCG için)

---

## 🚀 Hızlı Başlangıç (Lokal Geliştirme)

MCR, yerleşik veritabanı motoru (`@mcr/db`) ve otomatik CasparCG AMCP simülatörü ile **Docker kurulumu gerektirmeden sıfır bağımlılıkla** doğrudan çalıştırılabilir:

```bash
# 1. Proje dizinine gidin
cd /home/personal/infra/mcr-initial

# 2. Bağımlılıkları yükleyin
pnpm install

# 3. Tüm paketleri ve uygulamaları derleyin
pnpm build

# 4. Tüm servisleri (Web Studio + WebSocket Hub + Render Worker) eşzamanlı başlatın
pnpm dev
```

---

## 🐳 Docker Kurulumu ve Altyapı Servisleri

Prodüksiyon ortamında kalıcı PostgreSQL veritabanı, Redis render kuyruğu ve gerçek **CasparCG Server 2.4 (NDI Çıkışlı)** kullanmak için Docker altyapısı hazırlanmıştır.

### 1. Docker & Docker Compose Kurulumu

#### Ubuntu / Debian için:
```bash
# Gerekli paketleri kurun
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Docker GPG anahtarını ve reposunu ekleyin
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker Engine ve Docker Compose plugin'ini kurun
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Mevcut kullanıcıyı docker grubuna ekleyin
sudo usermod -aG docker $USER
newgrp docker
```

#### macOS için:
[Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) uygulamasını indirip kurmanız yeterlidir.

---

### 2. Altyapı Konteynerlerini Başlatma

`infra/` dizinindeki `docker-compose.yml` dosyası tek komutla tüm altyapıyı ayağa kaldırır:

```bash
cd /home/personal/infra/mcr-initial/infra

# Servisleri arka planda başlatın
docker compose up -d
```

Ayağa kalkan konteynerler:
* **PostgreSQL 16 (`mcr-postgres`):** `localhost:5432` (Kalıcı veritabanı)
* **Redis 7 (`mcr-redis`):** `localhost:6379` (Render iş kuyruğu)
* **CasparCG Server 2.4 (`mcr-casparcg`):** `localhost:5250` (AMCP Portu) + NDI Network Output

Konteyner durumlarını kontrol etmek için:
```bash
docker compose ps
docker compose logs -f casparcg
```

Konteynerleri durdurmak için:
```bash
docker compose down
```

---

## 🌐 Sayfa ve Port Haritası

| Servis / Arayüz | URL / Port | Açıklama |
|---|---|---|
| **Stüdyo Ana Dashboard** | [http://localhost:3000](http://localhost:3000) | Sistem metrikleri ve stüdyo modülleri |
| **Canlı Grafik & Switcher** | [http://localhost:3000/control](http://localhost:3000/control) | Canlı 1080p monitör, PGM/PVW Switcher, Rundown ve AMCP Terminali |
| **Haber Ticker Operatörü** | [http://localhost:3000/ticker](http://localhost:3000/ticker) | Haber bandı yönetimi, flaş haber modu ve hız kontrolü |
| **Kurgu & MAM Editörü** | [http://localhost:3000/editor](http://localhost:3000/editor) | Medya yükleme havuzu, katmanlı timeline ve FFmpeg render |
| **Meteoroloji Stüdyosu** | [http://localhost:3000/weather](http://localhost:3000/weather) | Open-Meteo canlı harita ve video segmenti üretici |
| **Yayın Çıkış Penceresi** | [http://localhost:3000/output](http://localhost:3000/output) | OBS / vMix / CasparCG için şeffaf 1080p grafik katmanı |
| **Realtime WebSocket Hub** | `ws://localhost:4001` | Çoklu operatör senkronizasyonu ve Switcher Gateway |
| **FFmpeg Render Worker** | `http://localhost:4002` | Video render kuyruğu ve MAM REST API |
| **CasparCG AMCP Playout** | `tcp://localhost:5250` | CasparCG sunucu kontrol protokolü |

---

## 🧪 Testleri Çalıştırma

Monorepo içerisindeki tüm birim ve entegrasyon testlerini çalıştırmak için:

```bash
pnpm test
```

Test edilen modüller:
* `@mcr/db`: Atomik depolama, MAM kayıtları ve RBAC kilit mekanizmaları.
* `@mcr/schema`: OGraf v1, Timeline EDL ve AMCP Zod şema doğrulamaları.
* `@mcr/templates`: 11 adet yayın şablonunun bütünlük ve katman çakışma kontrolleri.
* `@mcr/casparcg`: AMCP komut üretimi (`CG ADD`, `PLAY`, `STOP`) ve yanıt ayrıştırıcı.
* `@mcr/timeline`: SMPTE 50fps timecode matematiği, klip bölme ve aktif kare çözücü.
* `@mcr/realtime` & `@mcr/renderer`: Durum yönetimi ve FFmpeg kuyruk testleri.

---

## 📄 Lisans ve Teşekkürler

* **OGraf Specification:** EBU (European Broadcasting Union) Açık Yayın Grafiği Standardı ([spec.ograf.dev](https://spec.ograf.dev)).
* **CasparCG Server:** Sveriges Television (SVT) Açık Kaynak Yayın Motoru ([casparcg.com](https://casparcg.com)).
* **Open-Meteo:** Açık Meteoroloji API Servisi ([open-meteo.com](https://open-meteo.com)).
* **MapLibre GL:** Açık Kaynak Harita Motoru ([maplibre.org](https://maplibre.org)).
* **GSAP:** GreenSock Yüksek Performanslı Animasyon Kütüphanesi.
