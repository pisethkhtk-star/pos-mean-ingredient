# ណែនាំអំពីការដាក់ដំណើរការគម្រោង POS លើ Kali Linux ជាមួយ Nginx (Deployment Guide)

សៀវភៅណែនាំនេះនឹងបង្ហាញអ្នកពីរបៀបដាក់ដំណើរការ (Deploy) គម្រោង POS System នេះនៅលើ **Kali Linux** ដោយប្រើប្រាស់ **Nginx** ជា Reverse Proxy និង **PM2** សម្រាប់គ្រប់គ្រងដំណើរការ Node.js process ឱ្យរត់នៅ background។

---

## ជំហានទី ១៖ ដំឡើងកម្មវិធីចាំបាច់នៅលើ Kali Linux (Prerequisites)

ដោយសារ Kali Linux ផ្អែកលើ Debian យើងប្រើប្រាស់កម្មវិធីគ្រប់គ្រងកញ្ចប់ `apt` ដើម្បីដំឡើង៖

1. **ធ្វើបច្ចុប្បន្នភាពប្រព័ន្ធ (Update System):**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **ដំឡើង Node.js (ជំនាន់ v20.x ឡើងទៅត្រូវបានណែនាំ):**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
   *ដើម្បីផ្ទៀងផ្ទាត់ជំនាន់៖* 
   ```bash
   node -v
   npm -v
   ```

3. **ដំឡើង Git និង Nginx:**
   ```bash
   sudo apt install -y git nginx
   ```

4. **ដំឡើង PM2 (Process Manager សម្រាប់ Node.js):**
   ```bash
   sudo npm install -g pm2
   ```

---

## ជំហានទី ២៖ ដំឡើង និងរៀបចំ Database (PostgreSQL)

គម្រោងនេះប្រើប្រាស់ PostgreSQL។ អ្នកអាចជ្រើសរើសយកវិធីសាស្ត្រណាមួយក្នុងចំណោមវិធីទាំងពីរខាងក្រោម៖

### ជម្រើស A៖ ប្រើប្រាស់ Docker Compose (ងាយស្រួល និងលឿន)

ដោយសារតែគម្រោងមានឯកសារ `docker-compose.yml` រួចជាស្រេច៖

1. ដំឡើង Docker និង Docker Compose៖
   ```bash
   sudo apt install -y docker.io docker-compose
   sudo systemctl enable docker --now
   ```

2. បន្ថែម User បច្ចុប្បន្នទៅក្នុងក្រុម docker (ដើម្បីកុំឱ្យបាច់ប្រើ `sudo` ពេលបញ្ជា docker)៖
   ```bash
   sudo usermod -aG docker $USER
   ```
   *(បញ្ជាក់៖ អ្នកត្រូវកុំព្យូទ័រ Log out រួច Log in ចូល Kali Linux វិញ ដើម្បីឱ្យការកំណត់នេះមានប្រសិទ្ធភាព)*

---

### ជម្រើស B៖ ដំឡើង PostgreSQL ផ្ទាល់លើ Kali Linux

1. ដំឡើង PostgreSQL Service៖
   ```bash
   sudo apt install -y postgresql postgresql-contrib
   sudo systemctl enable postgresql --now
   ```

2. បង្កើត Database និង User៖
   ```bash
   sudo -i -u postgres
   psql
   ```
   វាយបញ្ជា SQL ខាងក្រោមក្នុង psql console៖
   ```sql
   CREATE DATABASE pos_db;
   CREATE USER postgres WITH PASSWORD 'postgres';
   GRANT ALL PRIVILEGES ON DATABASE pos_db TO postgres;
   \q
   exit
   ```

---

## ជំហានទី ៣៖ ទាញយក និងកំណត់រចនាសម្ព័ន្ធគម្រោង POS

1. **ទាញយក (Clone) កូដពី Git មកកាន់ Kali Linux៖**
   ```bash
   git clone https://github.com/pisethkhtk-star/POS-system.git
   cd POS-system
   ```

2. **ដំឡើង Node Dependencies:**
   ```bash
   npm install
   ```

3. **បង្កើត និងរៀបចំឯកសារបរិស្ថាន (`.env`):**
   ```bash
   cp .env.example .env
   nano .env
   ```
   កែប្រែតម្លៃកំណត់ `DATABASE_URL` ឱ្យត្រូវនឹងទិន្នន័យរបស់អ្នក៖
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_db?schema=public"
   NEXTAUTH_SECRET="7f3d4ef639b5a823cc1de8c9dcfbd2c3ae50db61b2c458a2d1e23f46f88aa8d2"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_NAME="My POS System"
   NEXT_PUBLIC_TAX_RATE=10
   ```
   *(ចុច `Ctrl+O` រួច `Enter` ដើម្បីរក្សាទុក និង `Ctrl+X` ដើម្បីចាកចេញពី nano)*

4. **ដំណើរការ PostgreSQL Container (ប្រសិនបើជ្រើសរើសជម្រើស A - Docker):**
   ```bash
   docker-compose up -d
   ```

5. **រៀបចំ Database Schema និងបញ្ចូលទិន្នន័យគំរូ (Prisma Setup & Seeding):**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

6. **សាងសង់គម្រោងសម្រាប់ផលិតកម្ម (Build Project for Production):**
   ```bash
   npm run build
   ```

---

## ជំហានទី ៤៖ ដំណើរការ Next.js ជាមួយ PM2

ដើម្បីឱ្យ Next.js server រត់នៅ background ទោះបីជាបិទ terminal ហើយដំណើរការឡើងវិញដោយស្វ័យប្រវត្តិពេល server គាំង ឬ restart៖

1. **ចាប់ផ្តើមដំណើរការ App ជាមួយ PM2:**
   ```bash
   pm2 start npm --name "pos-system" -- start
   ```

2. **ពិនិត្យស្ថានភាពដំណើរការ:**
   ```bash
   pm2 status
   ```

3. **កំណត់ឱ្យ PM2 រត់ស្វ័យប្រវត្តពេល Reboot Kali Linux៖**
   ```bash
   pm2 startup
   ```
   *បន្ទាប់ពីវាយ command ខាងលើ វានឹងបង្ហាញ command មួយជួរ (ចាប់ផ្តើមដោយ `sudo env PATH...`)។ ចូរចម្លង (Copy) command នោះទៅដំណើរការ ដើម្បីបញ្ចប់ការកំណត់ រួចវាយបញ្ជាខាងក្រោម៖*
   ```bash
   pm2 save
   ```

---

## ជំហានទី ៥៖ កំណត់រចនាសម្ព័ន្ធ Nginx Proxy

យើងកំណត់ឱ្យ Nginx ទទួល Requests ពី Port 80 (HTTP) រួចបញ្ជូនទៅកាន់ Port 3000 របស់ Next.js (PM2)៖

1. **បង្កើត configuration file ថ្មីសម្រាប់គម្រោង POS នៅក្នុង Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/pos-system
   ```

2. **ចម្លងការកំណត់ខាងក្រោមទៅដាក់ចូល៖**
   ```nginx
   server {
       listen 80;
       server_name localhost; # អាចជំនួសដោយ Domain Name ឬ IP Address របស់ Server

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           
           # កំណត់ទំហំសម្រាប់ Upload រូបភាពផលិតផល (ឧទាហរណ៍៖ 10MB)
           client_max_body_size 10M;
       }
   }
   ```

3. **ធ្វើឱ្យ configuration នេះដំណើរការ (Enable Configuration):**
   ```bash
   sudo ln -s /etc/nginx/sites-available/pos-system /etc/nginx/sites-enabled/
   ```

4. **លុប Default Site config របស់ Nginx ចោលដើម្បីកុំឱ្យជាន់គ្នា:**
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

5. **ពិនិត្យរចនាសម្ព័ន្ធកូដ Nginx ក្រែងលោមានកំហុសអក្ខរាវិរុទ្ធ (Syntax check):**
   ```bash
   sudo nginx -t
   ```

6. **Restart និងបើកដំណើរការ Nginx Service:**
   ```bash
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```

---

## ជំហានទី ៦៖ បើក Firewall (ប្រសិនបើមានប្រើ UFW)

ប្រសិនបើ Kali Linux របស់អ្នកមានបើក UFW Firewall ត្រូវអនុញ្ញាតឱ្យឆ្លងកាត់ Port 80៖
```bash
sudo ufw allow 'Nginx Full'
```

ឥឡូវនេះ អ្នកអាចចូលទៅកាន់ប្រព័ន្ធ POS របស់អ្នកតាមរយៈ Web Browser ដោយវាយអាសយដ្ឋាន IP របស់ Kali Linux ឬ `http://localhost` ជាការស្រេច!
