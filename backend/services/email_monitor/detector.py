# services/email_monitor/detector.py

KEYWORDS_SUBJECT = [
    "trial", "free trial", "your trial", "essai", "essai gratuit",
    "subscription", "abonnement", "invoice", "receipt", "billing",
    "renewal", "will be charged", "you'll be charged",
]

KEYWORDS_BODY = [
    "trial ends", "your trial ends", "ends on", "will be charged",
    "cancel anytime", "renewal", "billing", "subscription",
    "fin de l'essai", "vous serez facturé", "renouvellement",
]

def is_trial_candidate(subject: str, sender: str, snippet: str) -> bool:
    s = (subject or "").lower()
    f = (sender or "").lower()
    b = (snippet or "").lower()

    score = 0

    # Subject keywords
    if any(k in s for k in KEYWORDS_SUBJECT):
        score += 2

    # Body/snippet keywords
    if any(k in b for k in KEYWORDS_BODY):
        score += 1

    # Sender hints
    if "no-reply" in f or "noreply" in f or "billing" in f or "receipt" in f:
        score += 1

    # Threshold V1
    return score >= 2
