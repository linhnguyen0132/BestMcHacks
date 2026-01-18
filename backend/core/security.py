import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64
import secrets

# Get encryption key from environment
ENCRYPTION_KEY_HEX = os.environ.get("ENCRYPTION_KEY")

if not ENCRYPTION_KEY_HEX:
    raise RuntimeError("ENCRYPTION_KEY environment variable is required")

class Encryption:
    """AES-GCM encryption for OAuth tokens"""
    
    def __init__(self):
        try:
            self.key = bytes.fromhex(ENCRYPTION_KEY_HEX)
        except ValueError:
            raise RuntimeError("ENCRYPTION_KEY must be a valid hex string (64 chars)")
        
        if len(self.key) != 32:
            raise RuntimeError("ENCRYPTION_KEY must be 32 bytes (64 hex chars)")
        
        self.aesgcm = AESGCM(self.key)
    
    def encrypt(self, plaintext: str) -> dict:
        """Encrypt a string, return dict with encrypted data and nonce"""
        nonce = os.urandom(12)  # 96-bit nonce for GCM
        plaintext_bytes = plaintext.encode('utf-8')
        ciphertext = self.aesgcm.encrypt(nonce, plaintext_bytes, None)
        
        return {
            "data": base64.b64encode(ciphertext).decode('utf-8'),
            "nonce": base64.b64encode(nonce).decode('utf-8')
        }
    
    def decrypt(self, encrypted: dict) -> str:
        """Decrypt encrypted data"""
        ciphertext = base64.b64decode(encrypted["data"])
        nonce = base64.b64decode(encrypted["nonce"])
        plaintext_bytes = self.aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext_bytes.decode('utf-8')

# Global instance
encryption = Encryption()

def generate_token(length: int = 32) -> str:
    """Generate secure random token for CSRF protection"""
    return secrets.token_urlsafe(length)