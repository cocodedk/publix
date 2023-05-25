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

class ContentLine(UUIDModel):
    main_data = models.ForeignKey(MainData, related_name='content_lines', on_delete=models.CASCADE)
    line = models.TextField()
    email = models.EmailField(null=True, blank=True)
    password = models.CharField(max_length=255, null=True, blank=True)  # potentially hashed password


