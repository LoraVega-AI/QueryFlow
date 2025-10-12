from django.db import models

class Users(models.Model):
    username = models.CharField(max_length=255)
    email = models.CharField(max_length=255)
    password_hash = models.CharField(max_length=255)
    created_at = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'users'
