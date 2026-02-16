# Project Big maou maou

เว็บแอปสำหรับจัดการข้อมูลคอนเสิร์ต ศิลปิน ลูกค้า และการจองบัตร โดยใช้ 
**Node.js + Express + EJS + Sequelize ORM (SQLite)**

## Tech Stack
- Node.js (CommonJS)
- Express
- EJS (Template Engine)
- Sequelize ORM
- SQLite (`Database/database.sqlite`)

## โครงสร้างโปรเจกต์
```text
.
├── Database/
│   └── database.sqlite
├── public/
│   └── css/
│       └── style.css
├── src/
│   ├── app.js
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── views/
├── test/
│   └── smoke.test.js
├── package.json
└── README.md
```

## การติดตั้ง (Installation)
1. ติดตั้ง dependencies
   ```bash
   npm install
   ```

## การรันโปรเจกต์ (Run)
- โหมดปกติ:
  ```bash
  npm run start
  ```
- โหมดพัฒนา (auto-reload):
  ```bash
  npm run dev
  ```

เมื่อรันสำเร็จ ระบบจะฟังที่ `http://localhost:3000`

## โครงสร้าง API / Routes หลัก
> โปรเจกต์นี้ใช้ server-rendered views (EJS) เป็นหลัก แต่มี route แยกตาม resource ดังนี้

### Artists
- Base path: `/artists`
- ไฟล์ route: `src/routes/artist.routes.js`

### Concerts
- Base path: `/concerts`
- ไฟล์ route: `src/routes/concert.routes.js`

### Bookings
- Base path: `/bookings`
- ไฟล์ route: `src/routes/booking.routes.js`

### Customers
- Base path: `/customers`
- ไฟล์ route: `src/routes/customer.routes.js`

## หมายเหตุ
- การเชื่อมฐานข้อมูลกำหนดไว้ใน `src/models/index.js`