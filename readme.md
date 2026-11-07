# Campus Lab Equipment and Library Borrowing Management System

A MERN application for managing laboratory equipment and library book borrowing with student, staff and admin roles.

## Features

- Student: browse catalogue, request items, cancel pending requests, track loans
- Staff: manage categories, items and inventory units, review requests, issue and return loans, handle maintenance
- Admin: everything staff can do, plus staff account management and deletion rights
- JWT authentication with HTTP-only cookies and refresh tokens
- Transaction-safe approval, issue, return and maintenance flows

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose, Zod
- Frontend: React, Vite, Tailwind CSS, Redux Toolkit, Axios, React Hot Toast

## Setup

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=your_long_random_secret
REFRESH_TOKEN_SECRET=another_long_random_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
ADMIN_EMAIL=admin@campus.com
ADMIN_PASSWORD=ChangeThisPassword
```

MongoDB must run as a replica set (MongoDB Atlas works) because the app uses transactions.

```bash
npm run seed:admin
npm run dev
```

### Frontend

```bash
cd Frontend
npm install
```

Create `Frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

## Workflow

1. Student submits a borrow request
2. Staff approves it and assigns an available inventory unit (unit becomes reserved)
3. Staff issues the loan (unit becomes on loan)
4. Staff processes the return with a condition (unit becomes available, or goes to maintenance if damaged)
5. Maintenance is started and completed to return the unit to inventory