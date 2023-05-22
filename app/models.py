from django.db import models

# Create your models here.

class LeakedCredential(models.Model):
    """Model definition for LeakedCredential."""
    email = models.EmailField(max_length=255)
    password = models.CharField(max_length=255, null=True, blank=True)
    source_of_leak = models.CharField(max_length=255, null=True, blank=True)
    date_of_leak = models.DateTimeField(auto_now_add=True)
    user_name = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        verbose_name_plural = "Leaked Credentials"
    
    def __str__(self):
        return self.email