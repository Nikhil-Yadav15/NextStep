import os

dirs = [
    "p:/AsliCoders/Latest/NextStep/frontend/src/app/api/mentors/[id]",
    "p:/AsliCoders/Latest/NextStep/frontend/src/app/api/bookings/[id]",
    "p:/AsliCoders/Latest/NextStep/frontend/src/app/api/admin/bookings",
    "p:/AsliCoders/Latest/NextStep/frontend/src/app/api/admin/mentors/[id]",
    "p:/AsliCoders/Latest/NextStep/frontend/src/app/api/mentor/sessions",
    "p:/AsliCoders/Latest/NextStep/frontend/src/app/dashboard/counselling",
    "p:/AsliCoders/Latest/NextStep/frontend/src/app/dashboard/admin",
    "p:/AsliCoders/Latest/NextStep/frontend/src/app/dashboard/mentor",
    "p:/AsliCoders/Latest/NextStep/frontend/src/app/dashboard/session/[bookingId]",
    "p:/AsliCoders/Latest/NextStep/frontend/src/components/counselling",
    "p:/AsliCoders/Latest/NextStep/frontend/src/components/admin",
    "p:/AsliCoders/Latest/NextStep/frontend/src/components/mentor",
    "p:/AsliCoders/Latest/NextStep/frontend/src/components/session",
    "p:/AsliCoders/Latest/NextStep/frontend/src/hooks"
]

for directory in dirs:
    os.makedirs(directory, exist_ok=True)
    print(f"Created: {directory}")