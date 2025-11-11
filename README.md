# BookMyTable - Restaurant Booking System

**Group No**: 11  
**Members**:  
- Chan Tai Man (SID: 12345678)  
- Wong Siu Ying (SID: 87654321)  

---

## Project Files
- `server.js`: Express + MongoDB driver + cookie-session + CRUD + REST APIs
- `package.json`: Dependencies
- `views/`: EJS templates (login, list, create, edit, details, info)

---

## Cloud URL
https://comps381f-group11.onrender.com

---

## Operation Guide

### Login
- URL: `/login`
- Use: `admin` / `admin123`

### CRUD Web Pages
| Action | How |
|-------|-----|
| **Create** | Click "Create New" → fill form |
| **Read** | List + search by name/date/status |
| **Update** | Click booking → "Edit" |
| **Delete** | Click "Delete" on details |

> **Logout button** on list page

### RESTful APIs (cURL)
```bash
curl "https://comps381f-group11.onrender.com/api/bookings?date=2025-12-01"
curl -X POST https://comps381f-group11.onrender.com/api/bookings -F "customerName=John" -F "date=2025-12-01" -F "time=19:00" -F "pax=4"
curl -X PUT https://comps381f-group11.onrender.com/api/bookings/66f... -F "status=cancelled"
curl -X DELETE https://comps381f-group11.onrender.com/api/bookings/66f...
