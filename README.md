# BestMcHacks(imo)
McHacks 2026

🚀 **Free From Trial (FFT)**

🧠 **Inspiration**
Free trials are so *easily forgotten*. Many users lose money (often a ridiculous amount 😭) simply because they miss the cancellation window. **Free From Trial** helps users stay in control of their subscriptions by automatically detecting free-trial confirmations and reminding them before they're charged.

Right now:  
Free From Trial is a clean, simple **manual subscription & trial tracker**.  
Users can add their free trials / subscriptions by hand and see everything in one beautiful dashboard with:  
- Service name  
- Start date  
- End/charge date  
- Countdown (days remaining)  
- Direct cancellation link (when you provide it)  

This already helps a lot — no more "I forgot" moments when everything is visible at a glance!

**Not yet implemented (coming soon):**  
- Automatic scanning of Gmail for trial confirmation emails  
- Smart reminders (Google Calendar events, SMS)  
- Any kind of automatic detection  

🔐 **Authentication (Google OAuth)**  

Planned (not active in current version):  
- Users sign in using Google OAuth (testing phase)
- Secure, permission-based access to Gmail (read-only, testing phase)  
- FFT would only look for keywords like 'trial', 'free-trial', 'subscription confirmed', etc.  
- No passwords stored, no unnecessary data access.

🛠️ **How It Works** (Current version)

1. User adds trial manually through a simple form  
2. Trial data is securely stored in MongoDB Atlas  
3. Beautiful dashboard shows all your trials with countdown timers & urgency indicators  
4. Optional: add your own cancellation link for one-click access  

**Future flow (planned):**  
Google Login → Gmail Analysis (via keywords) → Auto-detect trials → Smart scheduling & notifications

🧩 **Tech Stack**

- Frontend: React / Next.js / Tailwind CSS  
- Backend: Node.js  
- Database: MongoDB Atlas  
- Infrastructure: Digital Ocean  
- (Future) Email Automation & Parsing: Gumloop

🏆 **Accomplishments**

- Built a clean, modern, mobile-friendly dashboard from scratch  
- Full manual trial CRUD (add/edit/delete)  
- Nice countdown timers + visual urgency cues  
- Successful deployment on Digital Ocean App Platform  
- Implemented secure data storage with MongoDB Atlas

📚 **What We Learned**

- OAuth security and permission scopes (prep work done!)  
- Backend + Frontend deployment with Digital Ocean App Platform is smooth  
- Secure and persistent data storage with MongoDB Atlas  
- Good UX/design matters more than fancy features at first

🔮 **What’s Next**

- Google OAuth + limited Gmail read access  
- Automatic trial detection from emails (keywords → Gumloop/custom parser)  
- Reminders before trial ends (5, 3, 1 days beforehand) via Calendar / SMS / email  
- Browser extension for one-click cancellation  
- Mobile app / PWA with push notifications  
- Subscription insights & spending analytics
