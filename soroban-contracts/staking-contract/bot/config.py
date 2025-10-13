import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    
    # Network Configuration
    NETWORK = os.getenv('NETWORK', 'mainnet')
    SOROBAN_RPC_URL = os.getenv('SOROBAN_RPC_URL', '')
    HORIZON_URL = os.getenv('HORIZON_URL', '')
    NETWORK_PASSPHRASE = os.getenv('NETWORK_PASSPHRASE', '')
    
    # Contract Addresses
    STAKING_CONTRACT_ID = os.getenv('STAKING_CONTRACT_ID', '')
    BLUB_TOKEN_ADDRESS = os.getenv('BLUB_TOKEN_ADDRESS', '')
    
    # Admin Credentials
    ADMIN_SECRET_KEY = os.getenv('ADMIN_SECRET_KEY', '')
    ADMIN_PUBLIC_KEY = os.getenv('ADMIN_PUBLIC_KEY', '')
    
    # Bot Settings
    POLL_INTERVAL = int(os.getenv('POLL_INTERVAL', 5))
    START_LEDGER = int(os.getenv('START_LEDGER', 0))
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', 100))
    
    # BLUB Configuration
    BLUB_MINT_PERCENTAGE = float(os.getenv('BLUB_MINT_PERCENTAGE', 1.1))
    BLUB_DEPLOYER_SECRET_KEY = os.getenv('BLUB_DEPLOYER_SECRET_KEY', '')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'bot.log')
    
    # Database
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///bot_events.db')
    
    # Retry Configuration
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', 3))
    RETRY_DELAY = int(os.getenv('RETRY_DELAY', 2))
    
    @classmethod
    def validate(cls):
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info("=" * 70)
        logger.info("🔧 VALIDATING CONFIGURATION")
        logger.info("=" * 70)
        
        logger.info(f"📡 Network: {cls.NETWORK}")
        logger.info(f"📡 Soroban RPC: {cls.SOROBAN_RPC_URL}")
        logger.info(f"📡 Horizon: {cls.HORIZON_URL}")
        logger.info(f"📝 Staking Contract: {cls.STAKING_CONTRACT_ID[:20]}..." if cls.STAKING_CONTRACT_ID else "❌ NOT SET")
        logger.info(f"💎 BLUB Token: {cls.BLUB_TOKEN_ADDRESS[:20]}..." if cls.BLUB_TOKEN_ADDRESS else "❌ NOT SET")
        logger.info(f"👤 Admin Key: {'✓ SET' if cls.ADMIN_SECRET_KEY else '❌ NOT SET'}")
        logger.info(f"🏭 BLUB Issuer: {'✓ SET' if cls.BLUB_DEPLOYER_SECRET_KEY else '❌ NOT SET'}")
        logger.info(f"⏱️  Poll Interval: {cls.POLL_INTERVAL}s")
        logger.info(f"🔄 Max Retries: {cls.MAX_RETRIES}")
        logger.info(f"📊 Log Level: {cls.LOG_LEVEL}")
        
        required = [
            ('STAKING_CONTRACT_ID', cls.STAKING_CONTRACT_ID),
            ('BLUB_TOKEN_ADDRESS', cls.BLUB_TOKEN_ADDRESS),
            ('ADMIN_SECRET_KEY', cls.ADMIN_SECRET_KEY),
            ('BLUB_DEPLOYER_SECRET_KEY', cls.BLUB_DEPLOYER_SECRET_KEY),
        ]
        
        missing = []
        for name, value in required:
            if not value:
                missing.append(name)
                logger.error(f"❌ Missing: {name}")
        
        if missing:
            logger.error("=" * 70)
            logger.error(f"❌ CONFIGURATION VALIDATION FAILED")
            logger.error(f"❌ Missing: {', '.join(missing)}")
            logger.error("=" * 70)
            raise ValueError(f"Missing required configuration: {', '.join(missing)}")
        
        logger.info("=" * 70)
        logger.info("✅ CONFIGURATION VALIDATION PASSED")
        logger.info("=" * 70)
        
        return True

