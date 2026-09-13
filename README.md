# Mahmuz — Türkiye At Yarışları

Türkiye genelindeki tüm at yarışı programlarını ve sonuçlarını gösteren, TJK'nın
herkese açık kaynaklarından veri çeken, bağımsız (Grok/başka bir platforma bağımlı
olmayan) bir web uygulaması.

Bu proje daha önce Grok ile başlatılmış bir prototipin devamıdır: Grok'un TJK veri
çekme mantığı incelenip hataları düzeltilerek, Grok'un platformuna özgü altyapıdan
(kendi auth sistemi, kendi "multiplayer" servisi, kendi deploy mekanizması)
tamamen bağımsız, sade bir Node/Express + React yığınına yeniden kuruldu.

## Özellikler

- Günlük yarış programı: tüm Türkiye hipodromları (İstanbul, İzmir, Ankara, Bursa,
  Adana, Antalya, Kocaeli, Şanlıurfa, Elazığ, Diyarbakır) + yurt dışı toplantılar
  ayrı sekmede
- Her koşuda: pist tipi (çim / kum / sentetik), mesafe, grup, ikramiye, hava durumu
  ve pist bilgisi (çim/kum derinliği, sıcaklık, nem)
- At tıklanınca: yaş/renk/cinsiyet, HP (handikap puanı), baba/anne/anne baba,
  antrenör ve sahip (profillerine link), kariyer istatistiği (dönem bazlı K/1/2/3/4/5
  ve kazanç), **tüm geçmiş koşuları** — her birinde o gün taşıdığı kilo, HP, jokey,
  derece, kaçıncı olduğu ve **koşu videosunu izleme linki**
- Jokey tıklanınca: aynı derinlikte profil — lisans tipi, doğum tarihi, dönemsel
  istatistik, son 10 günün tüm binişleri (kilo, HP, sıra, video)
- Antrenör / sahip profili: TJK sayfasından ilişkili atların listesi
- Sonuçlar sayfası: sonuçlanmış koşuları podyum (1-2-3) görünümünde özetler
- Arama: at / jokey / antrenör / sahip ismiyle canlı arama
- Favoriler: at ve jokeyleri takip listesine ekleme (cihazda saklanır, sunucuya
  gitmez)
- Tamamen mobil ve masaüstü uyumlu responsive tasarım

## Mimari

```
server/                Express API — TJK'ya server-side istek atar (CORS/robots
                        engelini aşmak ve tarayıcıya anahtar/gizli bilgi
                        sızdırmamak için istemci doğrudan TJK'ya istek atmaz)
  tjk/format.mjs        tarih, pist, isim yardımcı fonksiyonları
  tjk/parseHtml.mjs     TJK HTML sayfalarını (at/jokey/antrenör/sahip) parse eder
  tjk/client.mjs        ebayi.tjk.org JSON + tjk.org HTML kaynaklarını birleştirir,
                        bellek içi cache uygular
  index.mjs             API endpoint'leri + üretimde derlenmiş frontend'i sunar

src/                    React (Vite + react-router-dom + Tailwind) frontend
  components/           paylaşılan UI parçaları (RaceCard, Silk, VideoDialog, ...)
  pages/                sayfalar (HomePage, ResultsPage, HorsePage, JockeyPage, ...)
  lib/                  API istemcisi, tipler, tarih/biçim yardımcıları, favoriler
```

### Veri akışı

1. `GET /api/gun/:tarih?bolge=tr|dunya|all` → `ebayi.tjk.org/s/d/program/…` ve
   `…/sonuclar/…` JSON'larını birleştirir, günün tüm toplantılarını ve koşularını
   döner.
2. `GET /api/at/:id` → `tjk.org/.../AtKosuBilgileri?QueryParameter_AtId=...`
   sayfasını HTML olarak çekip parse eder (kimlik bilgisi + kariyer istatistiği +
   koşu geçmişi tablosu).
3. `GET /api/jokey/:id` → jokey istatistik sayfasını parse eder, ayrıca son 10
   günün programını tarayarak o jokeye ait tüm binişleri toplar (TJK'nın jokey
   sayfası her zaman güncel/detaylı biniş listesi vermediği için bu tamamlayıcı
   bir yöntemdir).
4. `GET /api/kisi/:antrenor|sahip/:id` → aynı sorgu şablonunu antrenör/sahip
   kimliğiyle çeker.
5. `GET /api/video/:atId/:kosuKod` → koşu video sayfasından doğrudan mp4 linkini
   çıkarır; bulunamazsa TJK'nın video sayfasına yönlendirir.
6. `GET /api/ara?q=...` → son 5 günün programını tarayarak isim eşleşmesi arar.

Tüm TJK istekleri sunucu tarafında (Node) yapılır ve 45 saniye ile 5 dakika
arasında değişen sürelerle bellek içinde cache'lenir, böylece aynı veri kısa
sürede tekrar tekrar TJK'ya gitmeden servis edilir.

## Kurulum

Node.js 18+ gerekir (test ortamı Node 22 ile hazırlandı).

```bash
npm install
```

### Geliştirme

İki terminal gerekir: biri API sunucusu, biri Vite dev sunucusu (Vite, `/api`
isteklerini otomatik olarak Express'e proxy'ler — bkz. `vite.config.ts`).

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini açın.

### Üretim derlemesi

```bash
npm run build      # dist/ klasörüne derler
npm run server     # Express hem /api'yi hem dist/'i tek portta (8787) sunar
```

Ardından `http://localhost:8787` adresinden tüm site (API + frontend) tek
sunucudan servis edilir. `PORT` ortam değişkeniyle portu değiştirebilirsiniz.

## Bilinen kısıtlar ve notlar

- **TJK'nın HTML yapısı değişebilir.** `parseHtml.mjs` içindeki hücre indeksleri
  (`cells[8]`, `cells[14]` gibi) TJK'nın mevcut tablo sırasına göre yazıldı.
  TJK sitesini güncellerse bu indekslerin yeniden ayarlanması gerekebilir. Kod,
  her bir alanın boş gelmesi durumunda çökmeyecek şekilde savunmacı yazıldı;
  ancak sıra tamamen değişirse yanlış sütuna denk gelebilir.
- Bu ortamda `npm install` çalıştırılamadığı (dışa ağ erişimi kapalı) için gerçek
  bir `npm run build` alınıp doğrulanamadı. Kod TypeScript kurallarına göre elle
  ve bağımlılıksız bir `tsc` taramasıyla gözden geçirildi; kalan tek tip
  uyarıları React'ın `key` özel prop'una dair olup `@types/react` kurulunca
  otomatik çözülen bilinen bir durumdur.
- TJK, otomatik erişime karşı `robots.txt` ile bazı yolları engelliyor olabilir;
  bu genelde arama motoru botlarını hedefler ve normal bir sunucu isteğini
  (bu projenin yaptığı gibi, gerçek bir tarayıcı User-Agent'ıyla) engellemez,
  ancak TJK ileride IP/oran sınırlaması getirirse `server/tjk/client.mjs`
  içindeki `fetchText` fonksiyonuna yeniden deneme/backoff eklemek gerekebilir.
- Video linkleri TJK'nın video sayfasından mp4 URL'si çekilerek elde edilir;
  TJK bu CDN yapısını değiştirirse `extractMp4` fonksiyonunun güncellenmesi
  gerekir. Video bulunamadığında kullanıcı otomatik olarak TJK'nın kendi video
  sayfasına yönlendirilir, böylece özellik tamamen kırılmaz.
- Favoriler yalnızca tarayıcının `localStorage`'ında tutulur; hesap sistemi
  yoktur (istenirse eklenebilir).

## Grok'un orijinal koduna göre yapılan düzeltmeler / eklemeler

- `isDomesticMeeting` fonksiyonundaki ölü kod bloğu düzeltildi (yurt içi/yurt
  dışı ayrımı önceden hiçbir zaman doğru çalışmıyordu).
- Jokey profiline doğum tarihi, lisans tipi ve şehir bilgisi eklendi; önceden
  yalnızca istatistik tablosu çekiliyordu.
- Antrenör ve sahip profil sayfaları eklendi (TJK aynı sorgu şablonunu bu
  kimlikler için de kullanıyor, önceden hiç kullanılmıyordu).
- HTML parse katmanına ikinci bir yakalama yöntemi (`dt/dd` etiket çiftleri)
  eklendi; TJK sayfası `span.key/value` yerine tanım listesi kullanırsa da
  veri boş dönmeyecek.
- Favoriler (takip listesi) özelliği eklendi.
- Arama artık antrenör ve sahipleri de kapsıyor.
- Tüm kod, Grok'un platformuna özgü altyapıdan (auth, multiplayer, kendi
  deploy sistemi) bağımsız hale getirildi.
