# Campus Lab Equipment and Library Borrowing Management System: Backend

REST API for managing laboratory equipment and library book borrowing. It supports three roles (student, staff and admin), cookie-based JWT authentication, email verification, password reset and transaction-safe borrowing flows.

## Features

- Students: register with email verification, browse the catalogue, request items, cancel pending requests and track loans
- Staff: manage categories, items and inventory units, review requests, issue and return loans, handle maintenance
- Admin: everything staff can do, plus staff account management and deletion or retirement rights
- JWT access and refresh tokens stored in HTTP-only cookies, with refresh token rotation
- Email verification for new student accounts (nodemailer)
- Forgot password and reset password by email link
- Transaction-safe approval, issue, return and maintenance flows (MongoDB transactions)
- Automatic overdue loan detection
- Dashboard statistics for staff and admin
- Request validation with Zod, security headers with Helmet, and rate limiting

## Tech Stack

- Node.js (ES modules) and Express 5
- MongoDB with Mongoose
- Zod for validation
- jsonwebtoken, bcryptjs and cookie-parser for authentication
- nodemailer for transactional email
- helmet, cors and express-rate-limit for security

## Project Structure

```text
backend
├── server.js
└── src
    ├── app.js
    ├── config
    │   └── db.js
    ├── controllers
    ├── models
    ├── routes
    ├── scripts
    │   └── createAdmin.js
    ├── utils
    │   ├── sendEmail.js
    │   └── tokens.js
    └── validators
```

## Requirements

- Node.js 18 or newer
- A MongoDB deployment running as a replica set. MongoDB Atlas works, and a standalone local MongoDB does not, because the app uses transactions.
- An SMTP account for sending email (Gmail with an App Password, or Mailtrap for testing)

## Setup

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

ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@campus.com
ADMIN_PASSWORD=ChangeThisPassword

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
MAIL_FROM="Campus Borrowing System <your_email@gmail.com>"
```

### Environment variables

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default 5000) |
| `NODE_ENV` | `development` or `production`. Production enables secure cookies with `sameSite: none`, which requires HTTPS |
| `MONGO_URI` | MongoDB connection string (replica set required) |
| `CLIENT_URL` | Frontend origin. It is used for CORS and for the links inside emails |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` | Long random strings used to sign tokens |
| `ACCESS_TOKEN_EXPIRES`, `REFRESH_TOKEN_EXPIRES` | Token lifetimes (defaults 15m and 7d) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used by the admin seed script |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP server credentials. Port 465 uses SSL, other ports use STARTTLS |
| `MAIL_FROM` | Sender shown on outgoing emails |

### Email provider notes

- **Gmail:** turn on 2-Step Verification, create an App Password, and use it as `SMTP_PASS`. Your normal password will not work.
- **Mailtrap (testing):** use `sandbox.smtp.mailtrap.io` as the host, port `2525`, and the credentials from your sandbox inbox. No real emails are sent.

### Create the admin account and start the server

```bash
npm run seed:admin
npm run dev
```

The API runs at `http://localhost:5000`. Health check: `GET /api/v1/health`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto restart) |
| `npm start` | Start in production mode |
| `npm run seed:admin` | Create the admin user from the `.env` values |

## Authentication and Email Flows

Tokens are sent as HTTP-only cookies (`accessToken`, `refreshToken`). The refresh token is stored hashed in the database and rotated on every refresh.

### Email verification (students)

1. `POST /api/auth/register` creates an unverified student and emails a verification link (valid for 24 hours).
2. The student opens the link, and the frontend calls `POST /api/auth/verify-email` with the token.
3. Students cannot log in until verified. Staff and admin accounts do not need verification.
4. `POST /api/auth/resend-verification` sends a new link.

### Password reset

1. `POST /api/auth/forgot-password` emails a reset link (valid for 1 hour).
2. `POST /api/auth/reset-password` sets the new password, signs the user out of all devices, and marks the account as verified.

### Security details

- Verification and reset tokens are random 32-byte values. Only a SHA-256 hash is stored in the database.
- Tokens are single-use and expire automatically.
- Forgot password and resend verification always return the same message, so account existence is never revealed.
- `/api/auth` allows 200 requests per 15 minutes, and the email endpoints allow 10 per 15 minutes.

### Existing students (upgrading from before email verification)

Students created before this feature are treated as unverified. Either let them use "Resend verification email" on the login page, or verify them all at once:

```js
db.users.updateMany({ role: "student" }, { $set: { isEmailVerified: true } })
```

## Borrowing Workflow

1. A student submits a borrow request (status `pending`).
2. Staff approves it and assigns an available inventory unit. The unit becomes `reserved` and the request becomes `approved`. A request can also be rejected with a reason.
3. Staff issues the loan. The unit becomes `on_loan` and the request becomes `issued`.
4. Staff processes the return with a condition. The unit becomes `available`, or `maintenance` if returned damaged (a maintenance record is created automatically).
5. Maintenance is started and completed, and the unit returns to `available` with its restored condition.

Loans past their due date are marked `overdue` automatically whenever loans are listed.

## API Reference

All routes are prefixed with `/api`. Unless stated otherwise, a logged-in user is required.

### Auth: `/api/auth`

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a student and send the verification email |
| POST | `/login` | Public | Log in (students must be verified) |
| POST | `/logout` | Public | Clear the session |
| POST | `/refresh` | Cookie | Rotate tokens |
| GET | `/profile` | Logged in | Current user |
| POST | `/verify-email` | Public | Verify email with a token |
| POST | `/resend-verification` | Public | Resend the verification email |
| POST | `/forgot-password` | Public | Send the password reset email |
| POST | `/reset-password` | Public | Set a new password with a token |

### Authorization checks: `/api/authorization`

| Method | Route | Access |
|---|---|---|
| GET | `/me` | Logged in |
| GET | `/staff-check` | Staff, admin |
| GET | `/admin-check` | Admin |

### Categories: `/api/categories`

| Method | Route | Access |
|---|---|---|
| POST | `/` | Staff, admin |
| GET | `/` and `/:id` | Logged in |
| PUT | `/:id` | Staff, admin |
| DELETE | `/:id` | Admin (blocked if the category has items) |

### Items: `/api/items`

| Method | Route | Access |
|---|---|---|
| POST | `/` | Staff, admin |
| GET | `/` and `/:id` | Logged in (supports `search`, `category`, `type`, `page`, `limit`) |
| PUT | `/:id` | Staff, admin |
| DELETE | `/:id` | Admin (deactivates the item) |

### Inventory units: `/api/inventory-units`

| Method | Route | Access |
|---|---|---|
| POST | `/` | Staff, admin |
| GET | `/` and `/:id` | Logged in (supports `item`, `status`, `condition`, `search`, `page`, `limit`) |
| PUT | `/:id` | Staff, admin |
| PATCH | `/:id/retire` | Admin |

### Borrow requests: `/api/borrow-requests`

| Method | Route | Access |
|---|---|---|
| POST | `/` | Student |
| GET | `/` and `/:id` | Logged in (students only see their own) |
| PATCH | `/:id/cancel` | Student (pending requests only) |
| PATCH | `/:id/approve` | Staff, admin |
| PATCH | `/:id/reject` | Staff, admin |

### Loans: `/api/loans`

| Method | Route | Access |
|---|---|---|
| POST | `/issue` | Staff, admin |
| GET | `/` and `/:id` | Logged in (students only see their own) |
| GET | `/overdue` | Staff, admin |
| PATCH | `/:id/return` | Staff, admin |

### Maintenance: `/api/maintenance`

| Method | Route | Access |
|---|---|---|
| POST | `/` | Staff, admin |
| GET | `/` and `/:id` | Staff, admin |
| PUT | `/:id` | Staff, admin |
| PATCH | `/:id/start` | Staff, admin |
| PATCH | `/:id/complete` | Staff, admin |

### Staff management: `/api/staff`

| Method | Route | Access |
|---|---|---|
| POST | `/` | Admin |
| GET | `/` and `/:id` | Admin |
| PUT | `/:id` | Admin |
| PATCH | `/:id/deactivate` and `/:id/reactivate` | Admin |

### Dashboard: `/api/dashboard`

| Method | Route | Access |
|---|---|---|
| GET | `/stats` | Staff, admin |

## Data Models

`User`, `Category`, `Item`, `InventoryUnit`, `BorrowRequest`, `Loan` and `Maintenance`.

- **Unit status:** `available`, `reserved`, `on_loan`, `maintenance`, `retired`
- **Unit condition:** `excellent`, `good`, `fair`, `damaged`
- **Request status:** `pending`, `approved`, `rejected`, `cancelled`, `issued`
- **Loan status:** `active`, `overdue`, `returned`
- **Maintenance status:** `pending`, `in_progress`, `completed`

## Troubleshooting

- **"Transaction numbers are only allowed on a replica set member":** your MongoDB is not a replica set. Use MongoDB Atlas or start a local replica set.
- **Cookies not saved or CORS errors:** `CLIENT_URL` must exactly match the frontend origin (for example `http://localhost:5173`, with no trailing slash).
- **Emails not arriving:** check the backend console for "Verification email failed". Most often the SMTP credentials are wrong, or Gmail needs an App Password.
- **Cookies not working in production:** production mode sets secure cookies, so both the API and the frontend must be served over HTTPS.