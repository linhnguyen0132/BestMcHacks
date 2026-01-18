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
const commonServices = {
    "Netflix": { icon: "🎬", cancelUrl: "https://netflix.com/cancel" },
    "Spotify": { icon: "🎵", cancelUrl: "https://spotify.com/account" },
    "Disney+": { icon: "🏰", cancelUrl: "https://disneyplus.com/account" },
    "Amazon Prime": { icon: "📦", cancelUrl: "https://amazon.com/prime" },
    "Apple Music": { icon: "🍎", cancelUrl: "https://music.apple.com/account" },
    "YouTube Premium": { icon: "▶️", cancelUrl: "https://youtube.com/premium" },
    "HBO Max": { icon: "🎭", cancelUrl: "https://hbomax.com/settings" },
    "Hulu": { icon: "📺", cancelUrl: "https://hulu.com/account" },
    "Adobe": { icon: "🎨", cancelUrl: "https://account.adobe.com" },
    "ChatGPT Plus": { icon: "🤖", cancelUrl: "https://chat.openai.com/settings" },
    "Claude Pro": { icon: "🧠", cancelUrl: "https://claude.ai/settings" },
    "Notion": { icon: "📝", cancelUrl: "https://notion.so/settings" },
    "Figma": { icon: "🎨", cancelUrl: "https://figma.com/settings" },
    "Canva Pro": { icon: "🖼️", cancelUrl: "https://canva.com/settings" }
};
