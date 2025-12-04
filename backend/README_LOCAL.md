# Local Development - Render PostgreSQL ile Test

## 🎯 Senaryo

- **Render.com**: Production verileri (managed PostgreSQL)
- **Local**: Dashboard geliştirme ve test
- **Hedef**: Local'de Render'daki gerçek verilerle test etmek

## ⚡ Hızlı Kurulum

### 1. Render'dan DATABASE_URL'i Alın

1. Render dashboard → PostgreSQL servisi
2. "Connections" sekmesi → **"External Database URL"** kopyalayın

### 2. .env Dosyasını Güncelleyin

`backend/.env` dosyasını açın ve `DATABASE_URL`'i Render URL'i ile değiştirin:

```bash
# Render'daki PostgreSQL'e bağlan (Production verileriyle test)
DATABASE_URL=postgres://user:password@dpg-xxxxx-a.oregon-postgres.render.com:5432/dbname
```

**Not**: `postgres://` ile başlıyorsa sorun yok, backend otomatik çevirir.

### 3. Backend'i Başlatın

```powershell
cd backend
docker compose -f docker-compose.local.yml up -d backend
```

**Not**: Local PostgreSQL container'ına ihtiyacınız yok, sadece backend'i başlatın.

### 4. Test Edin

```powershell
# Health check
curl http://localhost:8001/health

# API Docs
# Tarayıcıda: http://localhost:8001/docs
```

## ⚠️ ÖNEMLİ UYARI

**Local'deki tüm değişiklikler Render'daki PRODUCTION veritabanına yazılacaktır!**

- ✅ Test verileriyle çalışın
- ✅ Production verilerini silmeyin
- ✅ Dikkatli olun!

## 🔄 Local PostgreSQL'e Geri Dönmek

`.env` dosyasında:
```bash
DATABASE_URL=postgresql+psycopg2://editresume:password123@db:5432/editresume_db
```

Sonra:
```powershell
docker compose -f docker-compose.local.yml up -d
```

## 📝 Workflow

1. **Local'de geliştir**: Dashboard'u local'de geliştirin
2. **Render verileriyle test et**: Local backend Render PostgreSQL'e bağlı
3. **Push yap**: Değişiklikleri pushlayın
4. **Render deploy**: Render otomatik deploy eder

## 🐛 Sorun Giderme

### Connection Refused

- Render dashboard'da PostgreSQL'in "External Database URL" özelliğinin açık olduğundan emin olun
- IP whitelist'e local IP'nizi ekleyin

### Backend Başlamıyor

```powershell
# Logları kontrol et
docker compose -f docker-compose.local.yml logs backend

# Yeniden başlat
docker compose -f docker-compose.local.yml restart backend
```

