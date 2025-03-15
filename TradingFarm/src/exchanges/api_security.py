"""
API Security Module

Provides secure storage and management of exchange API keys.
Implements encryption for sensitive API credentials.
"""

import os
import json
import base64
import logging
import secrets
import hashlib
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import getpass


class APIKeyManager:
    """
    Manages secure storage and access to API keys.
    
    Features:
    - Encrypts API keys and secrets at rest
    - Provides secure access to decrypted keys only when needed
    - Supports custom master password or environment-based key
    - Implements key rotation and revocation
    """
    
    # Configuration file sections
    SECTION_META = "meta"
    SECTION_KEYS = "keys"
    
    def __init__(
        self,
        storage_path: str,
        logger: Optional[logging.Logger] = None,
        auto_save: bool = True,
        salt: Optional[bytes] = None,
        key_iterations: int = 100000
    ):
        """
        Initialize API key manager.
        
        Args:
            storage_path: Path to store the encrypted keys file
            logger: Optional logger
            auto_save: Whether to save changes automatically
            salt: Optional salt for key derivation
            key_iterations: Number of iterations for key derivation
        """
        self.storage_path = storage_path
        self.logger = logger or logging.getLogger("api_key_manager")
        self.auto_save = auto_save
        self._salt = salt or os.urandom(16)
        self._key_iterations = key_iterations
        
        # Encryption key
        self._encryption_key = None
        
        # API keys storage
        self._data = {
            self.SECTION_META: {
                "created_at": datetime.utcnow().isoformat(),
                "last_modified": datetime.utcnow().isoformat(),
                "version": "1.0.0"
            },
            self.SECTION_KEYS: {}
        }
        
        # Track initialization status
        self._initialized = False
    
    async def initialize(
        self,
        master_password: Optional[str] = None,
        env_var_name: Optional[str] = None,
        prompt_if_needed: bool = False
    ) -> bool:
        """
        Initialize the key manager and load keys.
        
        Args:
            master_password: Optional master password for encryption
            env_var_name: Optional environment variable name containing the master password
            prompt_if_needed: Whether to prompt for password if not provided
            
        Returns:
            True if initialized successfully, False otherwise
        """
        try:
            # Get the master password
            password = self._get_master_password(master_password, env_var_name, prompt_if_needed)
            
            if not password:
                self.logger.error("No master password provided")
                return False
            
            # Derive the encryption key
            self._encryption_key = self._derive_key(password)
            
            # Load existing keys if file exists
            if os.path.exists(self.storage_path):
                loaded = await self.load()
                if not loaded:
                    self.logger.error("Failed to load API keys")
                    return False
            else:
                # Create a new empty file
                await self.save()
            
            self._initialized = True
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing API key manager: {str(e)}")
            return False
    
    def _get_master_password(
        self,
        master_password: Optional[str],
        env_var_name: Optional[str],
        prompt_if_needed: bool
    ) -> Optional[str]:
        """
        Get the master password from provided sources.
        
        Args:
            master_password: Direct password
            env_var_name: Environment variable containing password
            prompt_if_needed: Whether to prompt if not provided
            
        Returns:
            Master password or None
        """
        # Check direct password first
        if master_password:
            return master_password
        
        # Try environment variable
        if env_var_name and env_var_name in os.environ:
            return os.environ[env_var_name]
        
        # Prompt if allowed
        if prompt_if_needed:
            try:
                return getpass.getpass("Enter API key encryption password: ")
            except Exception as e:
                self.logger.error(f"Error prompting for password: {str(e)}")
                return None
        
        return None
    
    def _derive_key(self, password: str) -> bytes:
        """
        Derive an encryption key from the master password.
        
        Args:
            password: Master password
            
        Returns:
            Derived encryption key
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self._salt,
            iterations=self._key_iterations,
            backend=default_backend()
        )
        
        # Convert the password to bytes and derive the key
        key = base64.urlsafe_b64encode(kdf.derive(password.encode('utf-8')))
        return key
    
    def _get_cipher(self) -> Fernet:
        """
        Get the encryption cipher.
        
        Returns:
            Fernet cipher
        """
        if not self._encryption_key:
            raise ValueError("Encryption key not initialized")
        
        return Fernet(self._encryption_key)
    
    def encrypt(self, text: str) -> str:
        """
        Encrypt text.
        
        Args:
            text: Text to encrypt
            
        Returns:
            Encrypted text (base64 encoded)
        """
        if not text:
            return ""
            
        cipher = self._get_cipher()
        encrypted = cipher.encrypt(text.encode('utf-8'))
        return base64.urlsafe_b64encode(encrypted).decode('utf-8')
    
    def decrypt(self, encrypted_text: str) -> str:
        """
        Decrypt text.
        
        Args:
            encrypted_text: Encrypted text (base64 encoded)
            
        Returns:
            Decrypted text
        """
        if not encrypted_text:
            return ""
            
        cipher = self._get_cipher()
        decoded = base64.urlsafe_b64decode(encrypted_text.encode('utf-8'))
        return cipher.decrypt(decoded).decode('utf-8')
    
    async def load(self) -> bool:
        """
        Load encrypted API keys from storage.
        
        Returns:
            True if loaded successfully, False otherwise
        """
        try:
            if not os.path.exists(self.storage_path):
                self.logger.warning(f"Storage file not found: {self.storage_path}")
                return False
            
            with open(self.storage_path, 'r') as f:
                encrypted_data = f.read()
            
            if not encrypted_data:
                self.logger.warning("Empty storage file")
                return False
            
            # Decrypt the data
            try:
                cipher = self._get_cipher()
                json_data = cipher.decrypt(base64.urlsafe_b64decode(encrypted_data)).decode('utf-8')
                data = json.loads(json_data)
                
                # Validate the data structure
                if not isinstance(data, dict):
                    self.logger.error("Invalid data format in storage file")
                    return False
                
                # Ensure required sections exist
                if self.SECTION_META not in data:
                    data[self.SECTION_META] = self._data[self.SECTION_META]
                
                if self.SECTION_KEYS not in data:
                    data[self.SECTION_KEYS] = {}
                
                self._data = data
                return True
                
            except Exception as e:
                self.logger.error(f"Error decrypting storage file: {str(e)}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error loading API keys: {str(e)}")
            return False
    
    async def save(self) -> bool:
        """
        Save encrypted API keys to storage.
        
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            # Update metadata
            self._data[self.SECTION_META]["last_modified"] = datetime.utcnow().isoformat()
            
            # Serialize to JSON
            json_data = json.dumps(self._data)
            
            # Encrypt the data
            cipher = self._get_cipher()
            encrypted_data = base64.urlsafe_b64encode(
                cipher.encrypt(json_data.encode('utf-8'))
            ).decode('utf-8')
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(os.path.abspath(self.storage_path)), exist_ok=True)
            
            # Write to file
            with open(self.storage_path, 'w') as f:
                f.write(encrypted_data)
            
            self.logger.debug("Saved API keys to storage")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving API keys: {str(e)}")
            return False
    
    def add_key(
        self,
        name: str,
        key_data: Dict[str, Any],
        overwrite: bool = False
    ) -> bool:
        """
        Add an API key.
        
        Args:
            name: Unique name/identifier for the key
            key_data: Key data (will be encrypted)
            overwrite: Whether to overwrite existing key
            
        Returns:
            True if added successfully, False otherwise
        """
        if not self._initialized:
            self.logger.error("API key manager not initialized")
            return False
        
        # Check if key already exists
        if name in self._data[self.SECTION_KEYS] and not overwrite:
            self.logger.warning(f"API key '{name}' already exists")
            return False
        
        # Encrypt sensitive fields
        encrypted_data = {}
        for field, value in key_data.items():
            if self._is_sensitive_field(field):
                encrypted_data[field] = self.encrypt(str(value))
            else:
                encrypted_data[field] = value
        
        # Add metadata
        encrypted_data["created_at"] = datetime.utcnow().isoformat()
        encrypted_data["last_modified"] = encrypted_data["created_at"]
        
        # Store the key
        self._data[self.SECTION_KEYS][name] = encrypted_data
        
        # Save if auto_save is enabled
        if self.auto_save:
            asyncio.create_task(self.save())
        
        self.logger.info(f"Added API key: {name}")
        return True
    
    def update_key(
        self,
        name: str,
        key_data: Dict[str, Any]
    ) -> bool:
        """
        Update an existing API key.
        
        Args:
            name: Name of the key to update
            key_data: New key data
            
        Returns:
            True if updated successfully, False otherwise
        """
        if not self._initialized:
            self.logger.error("API key manager not initialized")
            return False
        
        # Check if key exists
        if name not in self._data[self.SECTION_KEYS]:
            self.logger.warning(f"API key '{name}' not found")
            return False
        
        # Get the existing data
        existing_data = self._data[self.SECTION_KEYS][name]
        
        # Update with new data
        for field, value in key_data.items():
            if self._is_sensitive_field(field):
                existing_data[field] = self.encrypt(str(value))
            else:
                existing_data[field] = value
        
        # Update metadata
        existing_data["last_modified"] = datetime.utcnow().isoformat()
        
        # Save if auto_save is enabled
        if self.auto_save:
            asyncio.create_task(self.save())
        
        self.logger.info(f"Updated API key: {name}")
        return True
    
    def delete_key(self, name: str) -> bool:
        """
        Delete an API key.
        
        Args:
            name: Name of the key to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        if not self._initialized:
            self.logger.error("API key manager not initialized")
            return False
        
        # Check if key exists
        if name not in self._data[self.SECTION_KEYS]:
            self.logger.warning(f"API key '{name}' not found")
            return False
        
        # Delete the key
        del self._data[self.SECTION_KEYS][name]
        
        # Save if auto_save is enabled
        if self.auto_save:
            asyncio.create_task(self.save())
        
        self.logger.info(f"Deleted API key: {name}")
        return True
    
    def get_key(self, name: str, decrypt_sensitive: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get an API key.
        
        Args:
            name: Name of the key to get
            decrypt_sensitive: Whether to decrypt sensitive fields
            
        Returns:
            Key data or None if not found
        """
        if not self._initialized:
            self.logger.error("API key manager not initialized")
            return None
        
        # Check if key exists
        if name not in self._data[self.SECTION_KEYS]:
            return None
        
        # Get the key data
        key_data = self._data[self.SECTION_KEYS][name].copy()
        
        # Decrypt sensitive fields if requested
        if decrypt_sensitive:
            for field, value in key_data.items():
                if self._is_sensitive_field(field) and isinstance(value, str):
                    try:
                        key_data[field] = self.decrypt(value)
                    except Exception as e:
                        self.logger.error(f"Error decrypting field '{field}': {str(e)}")
        
        return key_data
    
    def get_all_keys(self, include_sensitive: bool = False) -> Dict[str, Dict[str, Any]]:
        """
        Get all API keys.
        
        Args:
            include_sensitive: Whether to include sensitive fields
            
        Returns:
            Dictionary of key data
        """
        if not self._initialized:
            self.logger.error("API key manager not initialized")
            return {}
        
        result = {}
        
        for name, key_data in self._data[self.SECTION_KEYS].items():
            key_copy = key_data.copy()
            
            if not include_sensitive:
                # Remove sensitive fields
                for field in list(key_copy.keys()):
                    if self._is_sensitive_field(field):
                        key_copy[field] = "********"
            
            result[name] = key_copy
        
        return result
    
    def _is_sensitive_field(self, field_name: str) -> bool:
        """
        Check if a field is sensitive and should be encrypted.
        
        Args:
            field_name: Field name
            
        Returns:
            True if sensitive, False otherwise
        """
        sensitive_fields = [
            'api_key', 'apikey', 'key',
            'api_secret', 'apisecret', 'secret',
            'private_key', 'privatekey',
            'password', 'passphrase',
            'token', 'access_token', 'refresh_token'
        ]
        
        field_lower = field_name.lower().replace('_', '')
        return any(sensitive in field_lower for sensitive in sensitive_fields)
    
    def get_key_names(self) -> List[str]:
        """
        Get names of all stored API keys.
        
        Returns:
            List of key names
        """
        if not self._initialized:
            self.logger.error("API key manager not initialized")
            return []
        
        return list(self._data[self.SECTION_KEYS].keys())
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the key storage.
        
        Returns:
            Metadata
        """
        if not self._initialized:
            self.logger.error("API key manager not initialized")
            return {}
        
        meta = self._data[self.SECTION_META].copy()
        meta['key_count'] = len(self._data[self.SECTION_KEYS])
        
        # Add key names without exposing sensitive data
        meta['keys'] = list(self._data[self.SECTION_KEYS].keys())
        
        return meta
    
    def change_master_password(
        self,
        new_password: str,
        current_password: Optional[str] = None
    ) -> bool:
        """
        Change the master password.
        
        Args:
            new_password: New master password
            current_password: Current master password (required if not already authenticated)
            
        Returns:
            True if changed successfully, False otherwise
        """
        if not self._initialized:
            self.logger.error("API key manager not initialized")
            return False
        
        # If not authenticated, verify current password
        if current_password:
            test_key = self._derive_key(current_password)
            if test_key != self._encryption_key:
                self.logger.error("Invalid current password")
                return False
        
        try:
            # Get a copy of all keys with decrypted values
            all_keys = {}
            for name in self.get_key_names():
                all_keys[name] = self.get_key(name, decrypt_sensitive=True)
            
            # Derive new encryption key
            self._encryption_key = self._derive_key(new_password)
            
            # Re-encrypt all keys with new key
            for name, key_data in all_keys.items():
                encrypted_data = {}
                for field, value in key_data.items():
                    if self._is_sensitive_field(field):
                        encrypted_data[field] = self.encrypt(str(value))
                    else:
                        encrypted_data[field] = value
                
                self._data[self.SECTION_KEYS][name] = encrypted_data
            
            # Save changes
            success = await self.save()
            if success:
                self.logger.info("Master password changed successfully")
            return success
            
        except Exception as e:
            self.logger.error(f"Error changing master password: {str(e)}")
            return False
    
    def is_initialized(self) -> bool:
        """
        Check if the key manager is initialized.
        
        Returns:
            True if initialized, False otherwise
        """
        return self._initialized


# Import for type checking only
try:
    import asyncio
except ImportError:
    pass
