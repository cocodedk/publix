from django.test import TestCase
from app.cryptography import Encryptor

class EncryptorTestCase(TestCase):
    def setUp(self):
        self.passphrase = b'my secret passphrase'
        self.encryptor = Encryptor(self.passphrase)

    def test_encryption_decryption(self):
        original_message = 'Hello, World!'
        encrypted_message = self.encryptor.encrypt(original_message)
        
        # Make sure the encrypted message is not the same as the original
        self.assertNotEqual(encrypted_message, original_message.encode())

        # Decrypt the message and make sure it matches the original
        decrypted_message = self.encryptor.decrypt(encrypted_message)
        self.assertEqual(decrypted_message, original_message)
