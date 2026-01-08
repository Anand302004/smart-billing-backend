# User Management Backend API

Node.js, Express आणि PostgreSQL वापरून तयार केलेला backend REST API.
या project मध्ये authentication, JWT security आणि OTP based email verification implement केले आहे.

---

## Features

- User Signup with OTP verification
- User Login with JWT authentication
- Forgot & Reset Password using OTP
- Protected APIs using JWT middleware
- Secure password hashing using bcrypt

---

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- JWT (JSON Web Token)
- Nodemailer
- bcrypt

---

## Project Structure

controllers/   → Business logic  
router/        → API routes  
middleware/    → JWT & OTP middleware  
db.js          → PostgreSQL connection  
server.js      → Application entry point  

---

## Environment Variables

Create a `.env` file in root directory:

DB_HOST=localhost  
DB_USER=postgres  
DB_PASS=your_password  
DB_NAME=your_database  
DB_PORT=5432  

JWT_SECRET=your_secret_key  

EMAIL_USER=your_email@gmail.com  
EMAIL_PASS=your_app_password  

---

## How to Run the Project

```bash
npm install
npm start
