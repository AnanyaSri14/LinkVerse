# LinkVerse 🚀

LinkVerse is a modern, real-time professional networking platform designed to connect users, facilitate real-time chat, and build professional relationships. Built on the MERN stack with Next.js/React.js, Node.js, Express, MongoDB, and Socket.io.

## 🔗 Live Deployments

- **Frontend App:** `https://<your-vercel-deployment-name>.vercel.app`
- **Backend API:** `https://<your-render-service-name>.onrender.com`

---

## 📸 Overview & Chat Flow

Here is the architectural overview of the chat functionality:

![Chat Functionality Flow Diagram](flow%20diagram%20of%20chat%20functionality.png)

---

## ✨ Features

- **🔒 Authentication & Security:** Secure JWT-based user register, login, automatic token refreshing, and password reset via Gmail SMTP OTP delivery.
- **💬 Real-Time Messaging:** Fully interactive real-time messaging powered by Socket.io, including typing indicators, online/presence indicators, and message history storage.
- **🤝 Professional Networking:** Connect with other users, view profiles, manage sent/received connection requests, and check mutual connections.
- **🔔 Notifications:** Dynamic in-app notifications for connection requests, status changes, and activities.
- **🖼️ Profile Management:** Complete user profiles showing work experience, headers, dynamic avatars, and secure file uploads.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Next.js (Pages router), Redux Toolkit (State Management), Axios, Socket.io-Client, CSS Modules, Tailwind CSS.
- **Backend:** Node.js, Express.js, MongoDB (Mongoose ORM), Socket.io, JSON Web Tokens (JWT), Nodemailer (OTP Delivery), Multer (File Uploads).

---

## 📁 Folder Structure

```text
LinkVerse/
├── frontend/             # Next.js Frontend Application
│   ├── public/           # Static assets (icons, images)
│   ├── src/
│   │   ├── config/       # API configuration & Redux store/actions/reducers
│   │   ├── layout/       # App layouts (Dashboard, User profile)
│   │   └── pages/        # Next.js Pages & Routing
│   ├── package.json
│   └── .env.example
│
├── backend/              # Express Backend Application
│   ├── controllers/      # Route handler logics
│   ├── middleware/       # Authentication & file upload middlewares
│   ├── models/           # Mongoose schemas (User, Connection, Message, etc.)
│   ├── routes/           # Express router endpoints
│   ├── utils/            # Authentication, validation, and email utilities
│   ├── uploads/          # User-uploaded files (profile pictures, etc.)
│   ├── package.json
│   └── .env.example
│
├── .gitignore            # Workspace-wide git exclusions
├── README.md             # Project documentation (this file)
└── flow diagram...png    # Chat flow chart image
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

Create a `.env` file in the `backend/` directory with the following variables:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/LinkVerse
JWT_ACCESS_SECRET=your-jwt-access-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
APP_BASE_URL=http://localhost:3000

# Gmail SMTP OTP delivery (Optional)
SMTP_SERVICE=gmail
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
MAIL_FROM="LinkVerse <your-email@gmail.com>"
```

### Frontend (`frontend/.env.local`)

Create a `.env.local` file in the `frontend/` directory with the following variables:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:9090
```

---

## 🚀 Installation & Local Run

Follow these steps to set up the project locally.

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster)

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd LinkVerse
```

### 2. Set up Backend
```bash
cd backend
npm install
# Set up your .env file according to .env.example
npm run dev
```
The backend server will run on [http://localhost:9090](http://localhost:9090).

### 3. Set up Frontend
```bash
cd ../frontend
npm install
# Set up your .env.local file according to .env.example
npm run dev
```
The frontend application will start on [http://localhost:3000](http://localhost:3000).

---

## 🔮 Future Enhancements

- **📁 File & Media Sharing:** Send PDFs, images, and document files directly within the real-time chat room.
- **📞 Audio & Video Calls:** WebRTC-based direct calling system embedded inside the message box.
- **📄 Advanced Feed & Post Interactions:** Add comments, likes, and shares to post feeds.
- **🔍 Elastic Search:** Search connections and posts dynamically with fuzzy matching.
