# POS Backend (Spring Boot 3 + Java 21)

ប្រព័ន្ធ Backend ថ្មីសម្រាប់ POS System ដែលបង្កើតឡើងដោយប្រើប្រាស់ **Spring Boot 3.3.5**, **Java 21**, **Spring Data JPA**, **Spring Security**, និង **PostgreSQL**។

គម្រោងនេះត្រូវគ្នាយ៉ាងពេញលេញជាមួយ Next.js Frontend (Drop-in replacement សម្រាប់ Express Backend នៅ Port `5000`)។

---

## 🛠️ បច្ចេកវិទ្យាដែលបានប្រើប្រាស់ (Tech Stack)

- **Language**: Java 21 (LTS)
- **Framework**: Spring Boot 3.3.5
- **ORM / Database**: Spring Data JPA, Hibernate, PostgreSQL
- **Security**: Spring Security 6, JWT (HS256) ជាមួយ HTTP-only Cookie (`token`) និង BCrypt Password Encoder
- **Build Tool**: Gradle 9.7+

---

## 📁 រចនាសម្ព័ន្ធគម្រោង (Project Structure)

```text
backend-spring-boot/
├── build.gradle
├── settings.gradle
├── src/main/
│   ├── java/com/pos/system/
│   │   ├── PosApplication.java           # Main Spring Boot Entry
│   │   ├── config/
│   │   │   ├── SecurityConfig.java       # CORS, Stateless Session, Route Matchers
│   │   │   ├── JwtAuthFilter.java        # Cookie/Bearer JWT Filter
│   │   │   ├── JwtUtil.java              # HS256 Token Sign & Verify
│   │   │   ├── UserPrincipal.java        # Security Context User Details
│   │   │   └── WebConfig.java            # Static File Serving (/uploads/**)
│   │   ├── entity/                       # JPA Database Entities
│   │   │   ├── User.java
│   │   │   ├── Category.java
│   │   │   ├── Product.java
│   │   │   ├── Ingredient.java
│   │   │   ├── ProductIngredient.java
│   │   │   ├── Customer.java
│   │   │   ├── Order.java
│   │   │   ├── OrderItem.java
│   │   │   ├── Supplier.java
│   │   │   ├── InventoryLog.java
│   │   │   ├── Discount.java
│   │   │   ├── Purchase.java
│   │   │   ├── PurchaseItem.java
│   │   │   ├── RolePermission.java
│   │   │   ├── Role.java
│   │   │   ├── PaymentMethod.java
│   │   │   └── OrderStatus.java
│   │   ├── repository/                   # Spring Data JPA Repositories
│   │   ├── dto/                          # Request/Response Data Objects
│   │   ├── service/                      # Core Business Logic & Stock Calculation
│   │   ├── controller/                   # REST API Controllers (/api/**)
│   │   └── seed/
│   │       └── DataSeeder.java           # Auto-seed Admin User & Roles on first run
│   └── resources/
│       └── application.properties        # Server Port, Database, JWT, Telegram Config
```

---

## 🚀 របៀបដំណើរការ (How to Run)

### វិធីទី ១៖ ប្រើប្រាស់ Script (Windows)
ចុច double-click លើ file [run-spring-backend.bat](file:///d:/project/pos-mean-ingredient/run-spring-backend.bat) នៅ root folder។

### វិធីទី ២៖ ប្រើប្រាស់ Terminal
```powershell
cd d:\project\pos-mean-ingredient\backend-spring-boot
gradle bootRun
```

ឬដំណើរការ file jar ដែលបាន build រួច៖
```powershell
java -jar build/libs/pos-backend-spring-boot-1.0.0.jar
```

---

## 🔑 គណនីលំនាំដើម (Default Admin Credentials)
- **Email**: `admin@pos.com`
- **Password**: `Admin@123`
- **Role**: `ADMIN`

---

## 🌐 បញ្ជី API Endpoints ដែលគាំទ្រ (Supported APIs)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/login` | POST | Public | ចូលប្រើប្រាស់ប្រព័ន្ធ និងបង្កើត HTTP-Only Cookie |
| `/api/auth/me` | GET | Authenticated | យកព័ត៌មាន User បច្ចុប្បន្ន និង Role Permissions |
| `/api/auth/logout` | POST | Public | ចាកចេញពីប្រព័ន្ធ |
| `/api/categories` | GET, POST | Auth / Manager | គ្រប់គ្រងប្រភេទមុខទំនិញ |
| `/api/categories/{id}` | PUT, DELETE | Manager | កែប្រែ ឬលុបប្រភេទមុខទំនិញ |
| `/api/products` | GET, POST | Auth / Manager | បញ្ជីទំនិញ និងបង្កើតទំនិញថ្មី |
| `/api/products/{id}` | GET, PUT, DELETE | Auth / Manager | មើលលម្អិត, កែប្រែ, លុបទំនិញ |
| `/api/products/import` | POST | Manager | នាំចូលទំនិញជាបណ្តុំ (CSV Bulk Import) |
| `/api/ingredients` | GET, POST | Auth / Manager | គ្រប់គ្រងគ្រឿងផ្សំឆៅ (Raw Ingredients) |
| `/api/ingredients/{id}` | GET, PUT, DELETE | Auth / Manager | មើល, កែប្រែ, លុបគ្រឿងផ្សំ |
| `/api/orders` | GET, POST | Authenticated | បញ្ជីការលក់ និងកាត់ស្តុកស្វ័យប្រវត្តតាម Recipe |
| `/api/orders/{id}` | GET, PUT | Auth / Manager | មើលវិក្កយបត្រ, Cancel ឬ Refund (បង្វិលស្តុកវិញ) |
| `/api/purchases` | GET, POST | Manager | ទិញគ្រឿងផ្សំចូលស្តុក (Stock IN) |
| `/api/inventory` | GET, POST | Auth / Manager | ប្រវត្តិ Inventory Logs និងការកែសម្រួលស្តុកផ្ទាល់ |
| `/api/customers` | GET, POST | Authenticated | គ្រប់គ្រងអតិថិជន និងពិន្ទុសន្សំ (Loyalty Points) |
| `/api/customers/{id}` | GET, PUT, DELETE | Auth / Manager | មើល, កែប្រែ, លុបអតិថិជន |
| `/api/discounts` | GET, POST, PUT, DELETE | Auth / Manager | កម្មវិធីបញ្ចុះតម្លៃ |
| `/api/reports` | GET | Admin | របាយការណ៍លក់ ចំណូល ចំណាយ ចំណេញ |
| `/api/roles` | GET, POST | Admin | កំណត់សិទ្ធិចូលទំព័រតាម Role |
| `/api/settings` | GET, POST | Auth / Admin | ការកំណត់ព័ត៌មានហាង |
| `/api/suppliers` | GET, POST, PUT, DELETE | Auth / Manager | គ្រប់គ្រងអ្នកផ្គត់ផ្គង់ |
| `/api/users` | GET, POST, PUT, DELETE | Admin | គ្រប់គ្រងគណនីបុគ្គលិក |
| `/api/upload` | POST | Manager | Upload រូបភាពទំនិញ |
| `/api/khqr` | POST | Authenticated | បង្កើត KHQR QR Code |
| `/api/telegram/send-receipt` | POST | Authenticated | ផ្ញើវិក្កយបត្រទៅ Telegram Channel/Group |
| `/health` | GET | Public | ពិនិត្យស្ថានភាព Server |
