"""Minimal care seed — no demo dietitian catalog.

Marketplace listings come only from admin-approved rows in Supabase (or tests
that register + approve a dietitian at runtime).
"""

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def default_availability():
    return [
        {"day": day, "enabled": day not in ("Sat", "Sun"), "start": "09:00", "end": "17:00"}
        for day in WEEKDAYS
    ]


USERS = [
    {
        "id": "user-sarah",
        "name": "Sarah Bennett",
        "email": "sarah@healthyyou.com",
        "role": "patient",
        "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
        "country": "United Kingdom",
    },
    {
        "id": "user-admin",
        "name": "Amelia Ward",
        "email": "admin@healthyyou.com",
        "role": "admin",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        "title": "Verification Lead",
    },
]

# Intentionally empty — never seed fake marketplace specialists.
DIETITIANS: list = []
APPLICATIONS: list = []
CONVERSATIONS: list = []
MESSAGES: list = []
APPOINTMENTS: list = []
FILES: list = []
CONSULTATION_REQUESTS: list = []
NOTIFICATIONS: list = []
MISSED_CALLS: list = []
PAYMENT_QUOTES: list = []
PAYMENTS: list = []

PATIENT_PROFILES = [
    {
        "userId": "user-sarah",
        "legalName": "Sarah Elizabeth Bennett",
        "preferredName": "Sarah",
        "dateOfBirth": "1992-04-18",
        "age": 34,
        "biologicalSex": "Female",
        "genderIdentity": "Woman",
        "primaryLanguage": "English",
        "phone": "+44 7700 900184",
        "emergencyContact": "James Bennett (partner)",
        "emergencyPhone": "+44 7700 900185",
        "conditions": [
            {
                "name": "Type 2 Diabetes",
                "diagnosed": "2021-06-12",
                "physician": "Dr. Helen Okonkwo",
                "clinic": "Camden Metabolic Clinic",
            },
            {
                "name": "IBS",
                "diagnosed": "2019-11-03",
                "physician": "Dr. Helen Okonkwo",
                "clinic": "Camden Metabolic Clinic",
            },
        ],
        "heightCm": 165,
        "weightKg": 72.4,
        "targetWeightKg": "64–68",
        "bmi": 26.6,
        "weightHistory": "Gained ~8kg after diagnosis in 2021; stable for the last 6 months.",
        "allergies": ["Peanuts", "Shellfish"],
        "intolerances": ["Lactose", "High-FODMAP onion/garlic"],
        "dietPreferences": ["Mediterranean-forward", "Low-FODMAP when flaring"],
        "medications": "Metformin 500mg twice daily; Ramipril 2.5mg daily",
        "supplements": "Vitamin D3 2000 IU; Magnesium glycinate 200mg at night",
        "occupation": "Product manager — mostly sedentary, 2 office days",
        "sleep": "6.5–7 hours, later bedtime on weeknights",
        "exercise": "2x strength, 1x 40-min walk most weeks",
        "alcohol": "2–3 glasses of wine per week",
        "smoking": "Never",
    }
]

PATIENT_SETTINGS = [
    {
        "userId": "user-sarah",
        "email": "sarah@healthyyou.com",
        "phone": "+44 7700 900184",
        "twoFactorSms": True,
        "twoFactorApp": False,
        "timeZone": "Europe/London",
        "remind24h": True,
        "remind1h": True,
        "notifyPush": True,
        "notifyEmail": True,
        "notifySms": False,
        "quietHours": True,
        "quietFrom": "21:00",
        "quietTo": "07:30",
        "blurBackground": True,
        "cameraDefaultOn": True,
        "micDefaultOn": True,
        "blockedFileAccessIds": [],
    }
]

DEVICE_SESSIONS = [
    {
        "id": "sess-1",
        "userId": "user-sarah",
        "device": "MacBook Air · Chrome",
        "location": "London, UK",
        "lastActive": "Now",
        "current": True,
    },
    {
        "id": "sess-2",
        "userId": "user-sarah",
        "device": "iPhone 15 · Safari",
        "location": "London, UK",
        "lastActive": "Yesterday, 8:14 PM",
        "current": False,
    },
]

PAYMENT_METHODS = [
    {
        "id": "pm-1",
        "patientId": "user-sarah",
        "label": "Visa",
        "kind": "card",
        "last4": "4242",
        "expiry": "09/28",
        "isDefault": True,
    },
    {
        "id": "pm-2",
        "patientId": "user-sarah",
        "label": "Apple Pay",
        "kind": "wallet",
        "isDefault": False,
    },
]

DEMO_ACCOUNTS = [
    {
        "userId": "user-sarah",
        "label": "Patient",
        "detail": "Sarah Bennett — discover dietitians, message, and video consult",
    },
    {
        "userId": "user-admin",
        "label": "Admin",
        "detail": "Amelia Ward — credential queue, document check, approval",
    },
]


def initial_state():
    return {
        "users": [dict(item) for item in USERS],
        "dietitians": [],
        "applications": [],
        "conversations": [],
        "messages": [],
        "appointments": [],
        "files": [],
        "consultationRequests": [],
        "patientProfiles": [dict(item) for item in PATIENT_PROFILES],
        "patientSettings": [dict(item) for item in PATIENT_SETTINGS],
        "payments": [],
        "paymentQuotes": [],
        "paymentMethods": [dict(item) for item in PAYMENT_METHODS],
        "deviceSessions": [dict(item) for item in DEVICE_SESSIONS],
        "missedCalls": [],
        "notifications": [],
        "liveCalls": [],
    }
