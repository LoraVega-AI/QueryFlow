
# Django settings
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Database configuration
DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'testdb'
DB_USER = 'testuser'
DB_PASSWORD = 'testpass'
