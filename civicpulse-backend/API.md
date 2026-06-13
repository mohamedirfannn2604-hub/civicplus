# CivicPulse Backend API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most protected routes require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## AUTH

### Register
```
POST /api/auth/register
Body: { name, email, phone, password, blood_group }
Returns: { token, user }
```

### Login
```
POST /api/auth/login
Body: { email, password }
Returns: { token, user }
```

### Get Profile
```
GET /api/auth/profile     🔒
Returns: { id, name, email, phone, blood_group, role }
```

---

## ISSUES

### Report Issue
```
POST /api/issues
Body (multipart/form-data): { category, name, phone, location, description, photo? }
Returns: { ticket_no, id }
```

### Get Issues
```
GET /api/issues           🔒
Query: ?status=pending&category=road&limit=50
Returns: [ issue, ... ]
```

### Track by Ticket
```
GET /api/issues/track/:ticket_no
Returns: { issue }
```

### Update Status (Admin)
```
PATCH /api/issues/:id/status   🔒 admin
Body: { status: "pending|in_progress|resolved|rejected" }
```

---

## BLOOD DONORS

### Get Donors
```
GET /api/donors
Query: ?blood_group=O%2B&city=Cuddalore&available=1
Returns: [ donor, ... ]
```

### Register Donor
```
POST /api/donors
Body: { name, blood_group, phone, city, address?, user_id? }
Returns: { id }
```

---

## VOLUNTEERS

### Get Volunteers
```
GET /api/volunteers       🔒
Query: ?area=Medical&availability=Weekends
Returns: [ volunteer, ... ]
```

### Register Volunteer
```
POST /api/volunteers
Body: { name, age, email, phone, area, availability, user_id? }
Returns: { id }
```

---

## HOSPITALS
```
GET /api/hospitals
Query: ?type=Government&open_24h=1
Returns: [ hospital, ... ]
```

---

## SCHEMES
```
GET /api/schemes
Query: ?category=Health
Returns: [ scheme, ... ]
```

---

## NOTIFICATIONS
```
GET  /api/notifications       🔒
PATCH /api/notifications/:id/read   🔒
```

---

## CONTACT
```
POST /api/contact
Body: { name, email, subject, message }
```

---

## DASHBOARD
```
GET /api/dashboard    🔒
Returns: { stats, recent_issues, volunteer, donor }
```

---

## COMMUNITY STATS (Public)
```
GET /api/stats
Returns: { issues_reported, issues_resolved, blood_donors, volunteers, hospitals, users }
```

---

## Issue Status Values
| Value        | Meaning              |
|--------------|----------------------|
| pending      | Just submitted       |
| in_progress  | Being worked on      |
| resolved     | Fixed/closed         |
| rejected     | Not valid/duplicate  |

## Blood Groups
`A+`, `A-`, `B+`, `B-`, `O+`, `O-`, `AB+`, `AB-`

## Volunteer Areas
`Medical Aid`, `Food Distribution`, `Education Support`, `Disaster Relief`, `Environmental`, `Elder Care`, `Tech Support`

## Availability
`Weekends only`, `Weekday evenings`, `Full-time`, `Emergency only`
