# Restaurant Booking System - Group 11


## Info
- Group number: 11
- Group Leader: Kaitlyn Yip (13720495)
- Group Member: Lam Ching Yiu (13793309)
                KONG Hau Ying (13143638)
                KWAN Yuen Man (13713897)
                WU Yat Keung (13642323)

- Course: COMPS381F

## Files
- `server.js`: Express server with login, CRUD, REST API
- `package.json`: express, ejs, mongodb, cookie-session
- `views/`: EJS templates : `clist.ejs`, `create.ejs`, `detail.ejs`, `edit.ejs`, `header.ejs`, `info.ejs`, `list.ejs`, `login.ejs`, `register.ejs` for dynamically rendering HTML pages
           

## Cloud URL
`http://localhost:8099` (local)

`http://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/` (cloud)

## Operation
1. **Login**:
   - Users must log in at /login to access any CRUD page
   - Authentication uses cookie-session with secure secret
   - Logout button is present on every CRUD page via header.ejs
   - Unauthorized access → automatic redirect to /login
   - Two roles Admin and customers 
   - Admin username and password → `admin / 123456`
   - Customers username and password → `Peter / 123456` (example)
   - Customers can register a new account by themselve → using the register function
   
3. **CRUD**:
   - Create booking record: admin using the `+New` button
   - Booking List: display at the main page. 
   - Edit/Delete: `Edit` and `delete` button next to each records for edit and delete records.
   - Searching function: Can search specific records using Name, Phone number, date and pax. 
    
4. **REST API**:
Can directly type in the terminal

- Read the booking record
   ```bash
   curl https://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/api/bookings

- Create the booking system
  ```bash
  curl -X POST https://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/api/bookings \
    -H "Content-Type: application/json" \
    -d '{"name":"Tom","phone":"91234567","date":"2025-12-25","time":"19:00","pax":4}'

- Read the user/admin record
  ```bash
  curl https://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/api/users

  curl https://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/api/admin
  

- Add the user account record
  ```bash
  curl -X POST https://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/api/users   -H "Content-Type: application/json"   -d     '{"username":"Amy","password":"123456","role":"customer"}'

- Update the account password
  ```bash
   curl -X PATCH https://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/api/users/username/Amy \
    -H "Content-Type: application/json" \
    -d '{"password":"1234"}'

- Delete the account record by user name
  ```bash
  curl -X DELETE https://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/api/users/username/Amy
- Delete ALL users instantly
  ```bash
  curl -X DELETE http://localhost:8099/api/users/all -H "x-secret: my-super-secret-12345"

- List the user record to check whether it has create account and updata the account info.
  ```bash
  curl https://s381fgroupproject-e7bygjesh4hfamb6.germanywestcentral-01.azurewebsites.net/api/user






