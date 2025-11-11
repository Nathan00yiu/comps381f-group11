# comps381f-group11
COMP S381F Autumn 2025 Group 11 Project

# BookMyTable - Restaurant Booking System

**Group No**: 1  
**Members**:  
- Chan Tai Man (SID: 12345678)  
- Wong Siu Ming (SID: 87654321)  

---

## File Introduction

- `server.js`: Main Express app with login, CRUD, REST APIs
- `package.json`: Dependencies (Express, Mongoose, EJS, bcrypt)
- `public/`: CSS, JS, images
- `views/`: EJS templates (login, dashboard, forms)
- `models/`: Mongoose schemas (User, Table, Booking)

---

## Cloud URL

**https://comps381f-group1.onrender.com**

---

## Operation Guide

### 1. Login
- URL: `/login`
- Credentials: `admin` / `admin123`

### 2. CRUD Web Pages
| Action | How |
|-------|-----|
| **Create** | Click "New Booking" → fill form |
| **Read** | Search by name, date, status |
| **Update** | Click "Edit" on card |
| **Delete** | Click "Delete" → confirm |

> **Logout button** in navbar on every CRUD page

### 3. RESTful APIs (cURL)

```bash
# GET all
curl "https://comps381f-group1.onrender.com/api/bookings?date=2025-12-01"

# CREATE
curl -X POST https://comps381f-group1.onrender.com/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Alice","phone":"91234567","date":"2025-12-01T00:00:00Z","time":"19:00","pax":4,"table":"66f1a2b3c4d5e6f7g8h9i0j1"}'

# UPDATE
curl -X PUT https://comps381f-group1.onrender.com/api/bookings/66f1a2b3c4d5e6f7g8h9i0j2 \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelled"}'

# DELETE
curl -X DELETE https://comps381f-group1.onrender.com/api/bookings/66f1a2b3c4d5e6f7g8h9i0j2

# STATS
curl https://comps381f-group1.onrender.com/api/stats
