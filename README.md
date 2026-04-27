# RoomBuddy 🏠💰

**RoomBuddy** is a premium, mobile-first web application designed to help roommates track shared expenses, verify spending, and settle balances effortlessly. Built with a modern dark glass-morphism aesthetic, it provides a seamless and interaction-rich experience.

🚀 **Live Demo:** [roombuddy.vercel.app](https://roombuddy.vercel.app)

---

## ✨ Features

- **Mesh-Gradient UI:** Stunning dark-mode design with smooth animations and glass-morphism effects.
- **Real-time Expense Tracking:** Add expenses and see them update instantly across all members' devices.
- **Verification System:** Transparency is key—members can verify or dispute expenses added by others.
- **Smart Settlements:** Automatically calculates "who owes how much to whom" to simplify monthly reconciliations.
- **In-App Notifications:** Stay updated with a real-time notification bell for new expenses and verifications.
- **Mobile Friendly:** Optimized for a perfect experience on mobile devices and tablet screens.
- **Android Ready:** Fully configured with Capacitor to be generated as a native Android app.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + Custom CSS Modules
- **Backend/DB:** Firebase Firestore
- **Authentication:** Firebase Auth (Google & Email/Password)
- **Native Bridge:** Capacitor (for Android)
- **Language:** TypeScript

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Firebase Project

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/roombuddy.git
   cd roombuddy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env.local` file in the root directory and add your Firebase credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # Admin SDK (for API routes)
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_PRIVATE_KEY="your_private_key"
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📱 Generating Android App

RoomBuddy is ready for Android using Capacitor.

1. **Sync Capacitor:**
   ```bash
   npx cap sync
   ```

2. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

---

## 📝 License

This project is licensed under the ISC License.

---

Built with ❤️ for roommates everywhere.
