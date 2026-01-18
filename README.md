# BestMcHacks
McHacks 2026

🚀 **Free From Trial (FFT)**

🧠 **Inspiration**
Free trials are so *easily forgotten*. Many users lose money (often a ridiculous amount 😭) simply because they miss the cancellation window. **Free From Trial** helps users stay in control of their subscriptions by automatically detecting free-trial confirmations and reminding them before they're charged.

🎯 **What It Does**
**Free From Trial** focuses on **Gmail users**, securely scanning their inbox for free-trial confirmation emails and sending reminders via events on Google Calendar and/or SMS text to make sure they don't miss the cancellation window and before free-trial becomes paid subscription.

🔐 **Authentication (Google OAuth)**
- Users sign in using Google OAuth
- Secure, permission-based access to Gmail (testing phase)
- FFT only reads emails with key-words like : 'trials', 'free-trial', etc.
- No passwords stored, no unnecessary data access.

🛠️ **How It Works**
1. Google Login
   - Via Google OAuth (testing phase)
2. Gmail Analysis
   - Gumloop analyzes Gmail inboxes to detect new trials
3. Data Storage
   - Detected trials are securely stored in **MongoDB Atlas**
4. Backend & Scheduling
   - Web app hosted on **Digital Ocean**, FFT calculates trial expiration dates
5. Users Notification
   - Users receive reminders before the trial ends (5, 3, 1 days beforehand)
  
🧩 **Tech Stack**
- Authentication: Google OAuth (Gmail)
- Backend: Node.js
- Database: MongoDB Atlas
- Infrastructure: Digital Ocean
- Email Automation & Parsing: Gumloop 

🏆 **Accomplishments**
- Implemented secure Google OAuth Gmail authentication (testing phase)
- Data storage

 📚 **What We Learned**
- OAuth security and permission scopes
- Backend and Frontend deployment with App-Platform on Digital Ocean
- Secure and persistent data storage with MongoDB Atlas

🔮 **What’s Next**
- Support for non-Gmail email providers
- Browser extension for one-click cancellation
- Mobile app with push notifications
- Subscription insights & spending analytics
