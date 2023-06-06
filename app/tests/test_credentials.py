import hashlib
from django.test import TestCase
from app.models import ContentLine
from django.conf import settings
from app.cryptography import Encryptor

# create a fake emai
email = "something@example.com"
# create a fake password
password = "password"

class ContentLineTestCase(TestCase):
    
    def setUp(self):
        self.contentline_email = ContentLine.objects.create(email='test@domain.com',
                                                             salt='salt')
        self.contentline_no_email = ContentLine.objects.create(email=None,
                                                                salt='salt')
        
    def test_search_by_email_with_match(self):
        email = 'test@domain.com'
        salt = 'salt'
        email_hash = hashlib.sha256(email.lower().encode() + salt).hexdigest()
        
        result = ContentLine.search_by_email(email, salt)
        self.assertIn(self.contentline_email, result)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].email_hash, email_hash)
        
    def test_search_by_email_no_match(self):
        email = 'wrongemail@domain.com'
        salt = 'salt'

        result = ContentLine.search_by_email(email, salt)
        self.assertEqual(len(result), 0)
        
    def test_search_by_email_null_email(self):
        email = None
        salt = 'salt'

        result = ContentLine.search_by_email(email, salt)
        self.assertIn(self.contentline_no_email, result) 
        self.assertEqual(len(result), 1)
