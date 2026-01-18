// ====== DATA.JS - FreeFromTrial ======
// Fake data for testing - will be replaced by API calls later


// Status labels
const statusLabels = {
    urgent: "Expires soon!",
    warning: "Watch out",
    safe: "You're good",
    cancelled: "Cancelled"
};

// Status config
const statusConfig = {
    urgent: { threshold: 3, label: "Expires soon!" },
    warning: { threshold: 7, label: "Watch out" },
    safe: { threshold: Infinity, label: "You're good" },
    cancelled: { label: "Cancelled" }
};

// Calculate status based on days remaining
function calculateStatus(daysRemaining) {
    if (daysRemaining < 0) return 'cancelled';
    if (daysRemaining <= 3) return 'urgent';
    if (daysRemaining <= 7) return 'warning';
    return 'safe';
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

// Calculate days until expiry
function daysUntil(dateString) {
    const today = new Date();
    const expiry = new Date(dateString);
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Get total potential savings
function calculateSavings() {
    return subscriptions
        .filter(s => s.status === 'cancelled')
        .reduce((sum, s) => {
            const price = parseFloat(s.price.replace(/[^0-9.]/g, ''));
            return sum + (price || 0);
        }, 0);
}

// Icons for different service types
const serviceIcons = {
    "Entertainment": "🎬",
    "Music": "🎵",
    "Software": "💻",
    "AI Tools": "🤖",
    "Shopping": "🛒",
    "Productivity": "📝",
    "Gaming": "🎮",
    "Fitness": "💪",
    "News": "📰",
    "default": "📱"
};

// Common services with their cancel URLs
const commonServices = [
  { name: "Netflix", icon: "🎬", category: "Entertainment", price: "$15.99/month", cancelUrl: "https://www.netflix.com/YourAccount" },
  { name: "Spotify Premium", icon: "🎵", category: "Music", price: "$10.99/month", cancelUrl: "https://www.spotify.com/account/" },
  { name: "Disney+", icon: "🏰", category: "Entertainment", price: "$11.99/month", cancelUrl: "https://www.disneyplus.com/account" },
  { name: "Amazon Prime", icon: "📦", category: "Shopping", price: "$9.99/month", cancelUrl: "https://www.amazon.ca/primecentral" },
  { name: "Notion", icon: "📝", category: "Productivity", price: "$10/month", cancelUrl: "https://www.notion.so/my-account" },
  { name: "Adobe Creative Cloud", icon: "🎨", category: "Software", price: "$54.99/month", cancelUrl: "https://account.adobe.com/" },
  { name: "ChatGPT Plus", icon: "🤖", category: "AI Tools", price: "$20/month", cancelUrl: "https://chat.openai.com/#settings" },
  { name: "Figma", icon: "🎨", category: "Software", price: "$12/month", cancelUrl: "https://www.figma.com/settings" },
  { name: "Canva Pro", icon: "🖼️", category: "Software", price: "$12.99/month", cancelUrl: "https://www.canva.com/settings" },
];

// 🔥 Map ultra utile
const commonServicesMap = Object.fromEntries(
  commonServices.map(s => [s.name, s])
);
