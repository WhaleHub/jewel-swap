import logging
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, BigInteger, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import Config

logger = logging.getLogger(__name__)

Base = declarative_base()


class ProcessedEvent(Base):
    __tablename__ = 'processed_events'
    
    id = Column(Integer, primary_key=True)
    
    # Event data
    user_address = Column(String(56), nullable=False)
    aqua_amount = Column(BigInteger, nullable=False)
    lock_index = Column(Integer, nullable=False)
    duration_minutes = Column(Integer)
    reward_multiplier = Column(Integer)
    timestamp = Column(BigInteger)
    unlock_timestamp = Column(BigInteger)
    
    # Processing data
    ledger = Column(Integer, nullable=False)
    transaction_hash = Column(String(64))
    
    # BLUB minting
    blub_amount = Column(BigInteger)
    blub_mint_tx = Column(String(64))
    blub_mint_timestamp = Column(DateTime)
    
    # Contract invocation
    stake_blub_tx = Column(String(64))
    stake_blub_timestamp = Column(DateTime)
    
    # Status
    processed = Column(Boolean, default=False)
    error_message = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Database:
    def __init__(self):
        logger.info("=" * 70)
        logger.info("📊 INITIALIZING DATABASE")
        logger.info("=" * 70)
        
        logger.info(f"📁 Database URL: {Config.DATABASE_URL}")
        self.engine = create_engine(Config.DATABASE_URL)
        
        logger.info("🔍 Creating/verifying database schema...")
        Base.metadata.create_all(self.engine)
        logger.info("   ✓ Schema verified")
        
        logger.info("🔍 Creating database session...")
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        logger.info("   ✓ Session created")
        
        # Log table info
        logger.info("📋 Database tables:")
        for table in Base.metadata.tables:
            logger.info(f"   - {table}")
        
        logger.info("=" * 70)
        logger.info("✅ DATABASE INITIALIZED")
        logger.info("=" * 70)
    
    def save_event(self, event_data: dict) -> ProcessedEvent:
        """Save a new event"""
        logger.info("=" * 70)
        logger.info("💾 SAVING EVENT TO DATABASE")
        logger.info("=" * 70)
        
        logger.info(f"🔍 Creating event record...")
        logger.info(f"   ↳ User: {event_data['user'][:20]}...")
        logger.info(f"   ↳ AQUA Amount: {event_data['amount']/10000000:.2f}")
        logger.info(f"   ↳ Lock Index: {event_data['lock_index']}")
        logger.info(f"   ↳ Ledger: {event_data['ledger']}")
        logger.info(f"   ↳ BLUB Amount: {event_data.get('blub_amount', 0)/10000000:.2f}")
        
        event = ProcessedEvent(
            user_address=event_data['user'],
            aqua_amount=event_data['amount'],
            lock_index=event_data['lock_index'],
            duration_minutes=event_data.get('duration_minutes'),
            reward_multiplier=event_data.get('reward_multiplier'),
            timestamp=event_data.get('timestamp'),
            unlock_timestamp=event_data.get('unlock_timestamp'),
            ledger=event_data['ledger'],
            transaction_hash=event_data.get('transaction_hash'),
            blub_amount=event_data.get('blub_amount')
        )
        
        logger.info(f"🔍 Saving to database...")
        self.session.add(event)
        self.session.commit()
        
        logger.info("=" * 70)
        logger.info("✅ EVENT SAVED TO DATABASE")
        logger.info("=" * 70)
        logger.info(f"💾 Event ID: {event.id}")
        logger.info(f"💾 Lock #{event.lock_index} for {event.user_address[:10]}...")
        logger.info("=" * 70)
        
        return event
    
    def update_mint_tx(self, event_id: int, tx_hash: str):
        """Update BLUB mint transaction"""
        logger.info(f"💾 Updating mint TX for event {event_id}...")
        event = self.session.query(ProcessedEvent).filter_by(id=event_id).first()
        if event:
            logger.info(f"   ↳ Setting blub_mint_tx: {tx_hash[:20]}...")
            event.blub_mint_tx = tx_hash
            event.blub_mint_timestamp = datetime.utcnow()
            self.session.commit()
            logger.info(f"   ✅ Mint TX updated for event {event_id}")
        else:
            logger.error(f"   ❌ Event {event_id} not found in database")
    
    def update_stake_tx(self, event_id: int, tx_hash: str):
        """Update stake_minted_blub transaction"""
        logger.info(f"💾 Updating stake TX for event {event_id}...")
        event = self.session.query(ProcessedEvent).filter_by(id=event_id).first()
        if event:
            logger.info(f"   ↳ Setting stake_blub_tx: {tx_hash[:20]}...")
            event.stake_blub_tx = tx_hash
            event.stake_blub_timestamp = datetime.utcnow()
            event.processed = True
            logger.info(f"   ↳ Marking event as processed")
            self.session.commit()
            logger.info(f"   ✅ Stake TX updated for event {event_id}")
            logger.info(f"   ✅ Event marked as PROCESSED")
        else:
            logger.error(f"   ❌ Event {event_id} not found in database")
    
    def mark_error(self, event_id: int, error: str):
        """Mark event as error"""
        logger.error("=" * 70)
        logger.error(f"💾 MARKING EVENT {event_id} AS ERROR")
        logger.error("=" * 70)
        event = self.session.query(ProcessedEvent).filter_by(id=event_id).first()
        if event:
            logger.error(f"   ↳ Error message: {error[:100]}...")
            event.error_message = error[:500]
            self.session.commit()
            logger.error(f"   ❌ Event {event_id} marked with error")
            logger.error("=" * 70)
        else:
            logger.error(f"   ❌ Event {event_id} not found in database")
            logger.error("=" * 70)
    
    def get_unprocessed_events(self):
        return self.session.query(ProcessedEvent).filter_by(processed=False).all()
    
    def event_exists(self, user_address: str, lock_index: int, ledger: int) -> bool:
        logger.debug(f"🔍 Checking if event exists: User={user_address[:10]}..., Index={lock_index}, Ledger={ledger}")
        exists = self.session.query(ProcessedEvent).filter_by(
            user_address=user_address,
            lock_index=lock_index,
            ledger=ledger
        ).first() is not None
        
        if exists:
            logger.debug(f"   ℹ️  Event already exists in database")
        else:
            logger.debug(f"   ✓ Event is new")
        
        return exists

