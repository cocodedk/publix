import hashlib
from django.test import TestCase
from app.models import ContentLine, TLD, Domain, MainData
from django.conf import settings
from app.lib.cryptography import Encryptor
import uuid
from django.utils import timezone

# create a fake emai
email = "something@example.com"
# create a fake password
password = "password"

class ContentLineTestCase(TestCase):
    
    def setUp(self):
        self.encryptor = Encryptor(settings.ENCRYPTION_KEY + settings.SALT)
        self.tld = TLD.objects.create(name='com')
        self.domain = Domain.objects.create(name='example', tld=self.tld)
        self.main_data = MainData.objects.create(systemid=uuid.uuid4(), owner=uuid.uuid4(), storageid='storageid', instore=True, size=100, accesslevel=1, type=1, media=1, added=timezone.now(), date=timezone.now(), name='test', description='test description', xscore=1, simhash='simhash', bucket='bucket', keyvalues={'key': 'value'}, tags=['tag1', 'tag2'], accesslevelh='accesslevelh', mediah='mediah', simhashh='simhashh', typeh='typeh', randomid=uuid.uuid4(), bucketh='bucketh', indexfile='indexfile', historyfile='historyfile', perfectmatch=True, group='group')
        self.contentline = ContentLine(main_data=self.main_data, line='test line', email='test@example.com', password='testpassword', domain=self.domain)
        self.contentline.save(encryptor=self.encryptor, salt=settings.SALT)
        
    def test_save_with_email_and_password(self):
        self.assertIsNotNone(self.contentline.email_hash)
        self.assertNotEqual(self.contentline.email, 'test@example.com')
        self.assertIsNotNone(self.contentline.password)
        self.assertNotEqual(self.contentline.password, 'testpassword')
        self.assertEqual(self.encryptor.decrypt(self.contentline.line), 'test line')
        
    def test_save_with_email_only(self):
        contentline = ContentLine(main_data=self.main_data, line='test line', email='test@example.com', password=None, domain=self.domain)
        contentline.save(encryptor=self.encryptor, salt=settings.SALT)
        self.assertIsNotNone(contentline.email_hash)
        self.assertNotEqual(contentline.email, 'test@example.com')
        self.assertIsNone(contentline.password)
        self.assertEqual(self.encryptor.decrypt(self.contentline.line), 'test line')
        
    def test_save_with_no_email(self):
        contentline = ContentLine(main_data=self.main_data, line='test line', email=None, password=None, domain=self.domain)
        contentline.save(encryptor=self.encryptor, salt=settings.SALT)
        self.assertIsNone(contentline.email_hash)
        self.assertIsNone(contentline.email)
        self.assertIsNone(contentline.password)
        self.assertIsNone(contentline.password_hash)
        self.assertEqual(contentline.line, 'test line')
        
    def test_save_with_no_line(self):
        contentline = ContentLine(main_data=self.main_data, line=None, email='test@example.com', password='testpassword', domain=self.domain)
        with self.assertRaises(ValueError) as context:
            contentline.save(encryptor=self.encryptor, salt=settings.SALT)
        self.assertEqual('Line cannot be None', str(context.exception))

        
    def test_search_by_email_with_match(self):
        email = 'test@example.com'
        email_hash = ContentLine.hash_string(email, settings.SALT)
        
        result = ContentLine.search_by_email(email, settings.SALT)
        self.assertIn(self.contentline, result)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].email_hash, email_hash)
        
    def test_search_by_email_no_match(self):
        email = 'wrongemail@example.com'
        result = ContentLine.search_by_email(email, settings.SALT)
        self.assertEqual(len(result), 0)
        
    def test_search_by_email_null_email(self):
        email = None

        result = ContentLine.search_by_email(email, settings.SALT)
        self.assertEqual(len(result), 0)
        
    def test_search_by_email_with_multiple_matches(self):
        email = 'test@example.com'
        email_hash = ContentLine.hash_string(email, settings.SALT)
        
        # create a second content line with the same email
        contentline2 = ContentLine(main_data=self.main_data, line='test line 2', email='test@example.com', password='testpassword', domain=self.domain)
        contentline2.save(encryptor=self.encryptor, salt=settings.SALT)
        
        result = ContentLine.search_by_email(email, settings.SALT)
        self.assertIn(self.contentline, result)
        self.assertIn(contentline2, result)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].email_hash, email_hash)
        self.assertEqual(result[1].email_hash, email_hash)
        
    def test_search_by_email_with_different_salt(self):
        email = 'test@example.com'
        salt1 = b'salt1'
        salt2 = b'salt2'
        email_hash1 = ContentLine.hash_string(email, salt1)
        email_hash2 = ContentLine.hash_string(email, salt2)
        
        # create a second content line with the same email and a different salt
        contentline2 = ContentLine(main_data=self.main_data, line='test line 2', email='test@example.com', password='testpassword', domain=self.domain)
        contentline2.save(encryptor=self.encryptor, salt=salt2)
        
        result1 = ContentLine.search_by_email(email, salt1)
        self.assertNotIn(contentline2, result1)
                
        result2 = ContentLine.search_by_email(email, salt2)
        self.assertIn(contentline2, result2)
        self.assertEqual(len(result2), 1)
        self.assertEqual(result2[0].email_hash, email_hash2)
