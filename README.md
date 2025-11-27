# Restaurant Booking System - Group 11


## Info
- Group number: 11
- Group Leader: Kaitlyn Yip (SID: 12345678)
- Group Member: Lam Ching Yiu (SID 13793309)
                KONG Hau Ying (SID 13143638)
                KWAN Yuen Man (SID 13713897)
                WU Yat Keung (SID 13642323)

- Course: COMPS381F

## Files
- `server.js`: Express server with login, CRUD, REST API
- `package.json`: express, ejs, mongodb, cookie-session
- `views/`: EJS templates : `clist.ejs`, `create.ejs`, `detail.ejs`, `edit.ejs`, `header.ejs`, `info.ejs`, `list.ejs`, `login.ejs`, `register.ejs` for dynamically rendering HTML pages
           

## Cloud URL
http://localhost:8099 (local)

http://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/ (cloud)

## Operation
1. **Login**: two roles Admin and customers 
   Admin username and password → admin / 123456
   Customers username and password → Peter / 123456 (example)
   Customers can register a new account by themselve
3. **CRUD**:
   - Create: `/create`
   - List: `/`
   - Edit/Delete: via links
4. **REST API**:
   ```bash
   curl http://localhost:8099/api/bookings
   curl -X POST -d "name=Tom&phone=12345678&date=2025-12-01&time=18:00&pax=4" http://localhost:8099/api/bookings




