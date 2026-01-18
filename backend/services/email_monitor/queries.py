# services/email_monitor/queries.py

# Query Gmail (V1) - adapte comme tu veux
TRIAL_QUERY_V1 = (
    'newer_than:30d (trial OR "free trial" OR "your trial" OR essai OR "essai gratuit" '
    'OR subscription OR abonnement OR billing OR invoice OR receipt OR renewal OR "will be charged")'
)
