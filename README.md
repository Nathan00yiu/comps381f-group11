# Restaurant Booking System - Group 11


## Info
- Group Leader: Kaitlyn Yip (SID: 12345678)
- Group Member: Lam Ching Yiu (SID 13793309)
- Course: COMPS381F

## Files
- `server.js`: Express server with login, CRUD, REST API
- `package.json`: express, ejs, mongodb, cookie-session
- `views/`: EJS templates

## Cloud URL
http://localhost:8099 (local)

s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net

## Operation
1. **Login**: `/login` → admin / 1234
2. **CRUD**:
   - Create: `/create`
   - List: `/`
   - Edit/Delete: via links
3. **REST API**:
   ```bash
   curl http://localhost:8099/api/bookings
   curl -X POST -d "name=Tom&phone=12345678&date=2025-12-01&time=18:00&pax=4" http://localhost:8099/api/bookings
