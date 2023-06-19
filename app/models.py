import hashlib
from django.db import models
import uuid
from django.db import models

# Create your models here.
# abstract class to add uuid to all models
class UUIDModel(models.Model):
    pkid = models.BigAutoField(primary_key=True, editable=False)
    id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    class Meta:
        abstract = True

class MainData(UUIDModel):
    systemid = models.UUIDField(max_length=200)
    owner = models.UUIDField(max_length=200)
    storageid = models.CharField(max_length=200)
    instore = models.BooleanField()
    size = models.IntegerField()
    accesslevel = models.IntegerField()
    type = models.IntegerField()
    media = models.IntegerField()
    added = models.DateTimeField()
    date = models.DateTimeField()
    name = models.CharField(max_length=200)
    description = models.TextField()
    xscore = models.IntegerField()
    simhash = models.CharField(max_length=200)
    bucket = models.CharField(max_length=200)
    keyvalues = models.JSONField(null=True, blank=True)
    tags = models.JSONField(null=True, blank=True)
    accesslevelh = models.CharField(max_length=200)
    mediah = models.CharField(max_length=200)
    simhashh = models.CharField(max_length=200)
    typeh = models.CharField(max_length=200)
    randomid = models.UUIDField()
    bucketh = models.CharField(max_length=200)
    indexfile = models.CharField(max_length=200)
    historyfile = models.CharField(max_length=200, null=True, blank=True)
    perfectmatch = models.BooleanField()
    group = models.CharField(max_length=200)

    # tostring
    def __str__(self):
        return f"{self.date} {self.description} {self.name} {self.bucket} {self.bucketh}"

class Relation(UUIDModel):
    main_data = models.ForeignKey(MainData, related_name='relations', on_delete=models.CASCADE)
    target = models.UUIDField(max_length=200)
    relation = models.IntegerField()


class Tagsh(UUIDModel):
    main_data = models.ForeignKey(MainData, related_name='tagshs', on_delete=models.CASCADE)
    class_field = models.IntegerField()
    classh = models.CharField(max_length=200)
    value = models.CharField(max_length=200)
    valueh = models.CharField(max_length=200)

class TLD(UUIDModel):
    name = models.CharField(max_length=100, unique=True)
    # any other fields you may need for a TLD

class Domain(UUIDModel):
    name = models.CharField(max_length=100)
    tld = models.ForeignKey(TLD, related_name='domains', on_delete=models.CASCADE)
    # any other fields you may need for a domain
    class Meta:
        unique_together = ('name', 'tld',)        

class ContentLine(UUIDModel):
    main_data = models.ForeignKey(MainData, related_name='content_lines', on_delete=models.CASCADE)
    line = models.BinaryField()
    email = models.BinaryField()  # encrypted email
    email_hash = models.CharField(max_length=64)  # hashed email for blind indexing
    password = models.BinaryField(null=True, blank=True)  # encrypted password
    password_hash = models.CharField(max_length=64, null=True, blank=True)  # hashed password for blind indexing
    domain = models.ForeignKey(Domain, related_name='content_lines', on_delete=models.CASCADE)

    def save(self, encryptor, salt, *args, **kwargs):

        if self.email is not None:
            # lowercase the email to make it case insensitive
            self.email = self.email.lower()
            # Create a hash for indexing
            self.email_hash = self.hash_string(self.email, salt)            
            # Encrypt email
            self.email = encryptor.encrypt(self.email)

            if self.password is not None:
                self.password_hash = self.hash_string(self.password, salt)
                # Encrypt password
                self.password = encryptor.encrypt(self.password)                

            if self.line is not None:
                # Encrypt line
                self.line = encryptor.encrypt(self.line.strip())

        super().save(*args, **kwargs)

    # create a class mehtod for hasing strings with salt
    # lowercase the string to make it case insensitive
    # encode the string to bytes and then hash it
    @classmethod
    def hash_string(cls, string, salt):
        return hashlib.sha256(string.encode() + salt).hexdigest()

    @classmethod
    def search_by_email(cls, email, salt, main_data = None):
        email_hash = hashlib.sha256(email.lower().encode() + salt).hexdigest()
        if main_data is not None:
            return cls.objects.filter(email_hash=email_hash, main_data=main_data)
        return cls.objects.filter(email_hash=email_hash)

    @classmethod
    def search_by_password(cls, password, salt, main_data = None):
        password_hash = hashlib.sha256(password.encode() + salt).hexdigest()
        if main_data is not None:
            return cls.objects.filter(password_hash=password_hash, main_data=main_data)        
        return cls.objects.filter(password_hash=password_hash)
