import asyncio
import logging
import signal
import sys
from datetime import datetime
from typing import Optional

from config import Config
from event_listener import StakingEventListener
from blub_minter import BlubMinter
from contract_invoker import ContractInvoker
from database import Database

# Setup logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Config.LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


class StakingBot:
    """Main bot orchestrator"""
    
    def __init__(self):
        logger.info("=" * 70)
        logger.info("🤖 INITIALIZING STAKING BOT")
        logger.info("=" * 70)
        
        logger.info("🔍 Step 1: Validating configuration...")
        Config.validate()
        
        logger.info("🔍 Step 2: Initializing event listener...")
        self.event_listener = StakingEventListener()
        
        logger.info("🔍 Step 3: Initializing BLUB minter...")
        self.blub_minter = BlubMinter()
        
        logger.info("🔍 Step 4: Initializing contract invoker...")
        self.contract_invoker = ContractInvoker()
        
        logger.info("🔍 Step 5: Initializing database...")
        self.database = Database()
        
        self.running = False
        
        logger.info("=" * 70)
        logger.info("✅ BOT INITIALIZATION COMPLETE")
        logger.info("=" * 70)
        logger.info(f"📍 Monitoring contract: {Config.STAKING_CONTRACT_ID[:20]}...")
        logger.info(f"🏭 BLUB token: {Config.BLUB_TOKEN_ADDRESS[:20]}...")
        logger.info(f"⏱️  Poll interval: {Config.POLL_INTERVAL}s")
        logger.info(f"🔄 Max retries: {Config.MAX_RETRIES}")
        logger.info("=" * 70)
    
    async def start(self):
        """Start the bot"""
        logger.info("🚀 Starting Staking Bot...")
        self.running = True
        
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        
        try:
            await self.monitor_events()
        except Exception as e:
            logger.error(f"❌ Fatal error: {e}", exc_info=True)
        finally:
            await self.shutdown()
    
    async def monitor_events(self):
        """Main event monitoring loop"""
        logger.info("=" * 70)
        logger.info("👂 STARTING EVENT MONITORING LOOP")
        logger.info("=" * 70)
        logger.info(f"⏱️  Polling every {Config.POLL_INTERVAL} seconds")
        logger.info(f"🔄 Will retry failed operations {Config.MAX_RETRIES} times")
        logger.info("=" * 70)
        
        poll_count = 0
        
        while self.running:
            try:
                poll_count += 1
                logger.debug(f"\n{'=' * 70}")
                logger.debug(f"🔄 Poll #{poll_count}")
                logger.debug(f"{'=' * 70}")
                
                # Poll for new events
                events = await self.event_listener.poll_events()
                
                if events:
                    logger.info(f"🎯 Processing {len(events)} event(s)...")
                    
                    # Process each event
                    for idx, event in enumerate(events):
                        logger.info(f"\n{'=' * 70}")
                        logger.info(f"📦 Processing event {idx+1}/{len(events)}")
                        logger.info(f"{'=' * 70}")
                        await self.process_event(event)
                else:
                    logger.debug("   ℹ️  No new events found")
                
                # Wait before next poll
                logger.debug(f"⏸️  Waiting {Config.POLL_INTERVAL}s before next poll...\n")
                await asyncio.sleep(Config.POLL_INTERVAL)
                
            except Exception as e:
                logger.error("=" * 70)
                logger.error("❌ ERROR IN MONITORING LOOP")
                logger.error("=" * 70)
                logger.error(f"❌ Error type: {type(e).__name__}")
                logger.error(f"❌ Error message: {str(e)}")
                logger.error(f"❌ Full traceback:", exc_info=True)
                logger.error("=" * 70)
                logger.error(f"⏸️  Waiting {Config.RETRY_DELAY}s before retry...")
                await asyncio.sleep(Config.RETRY_DELAY)
    
    async def process_event(self, event: dict):
        """
        Process a single lock event
        
        Flow:
        1. Save event to database
        2. Mint BLUB tokens to staking contract
        3. Call stake_minted_blub() on contract
        """
        try:
            user = event['user']
            aqua_amount = event['amount']
            lock_index = event['lock_index']
            
            logger.info("="*60)
            logger.info(f"🔔 Processing Lock Event")
            logger.info(f"   User: {user}")
            logger.info(f"   AQUA Amount: {aqua_amount/10000000:.2f}")
            logger.info(f"   Lock Index: {lock_index}")
            logger.info(f"   Duration: {event.get('duration_minutes')} minutes")
            logger.info("="*60)
            
            if self.database.event_exists(user, lock_index, event['ledger']):
                logger.warning(f"⚠️  Event already processed, skipping...")
                return
            
            blub_amount = self.blub_minter.calculate_blub_amount(aqua_amount)
            event['blub_amount'] = blub_amount
            
            db_event = self.database.save_event(event)
            
            # Step 1: Mint BLUB to contract
            logger.info(f"🏭 Step 1: Minting {blub_amount/10000000:.2f} BLUB to contract...")
            mint_tx = await self.mint_blub_with_retry(aqua_amount, lock_index, user)
            
            if not mint_tx:
                error_msg = "BLUB minting failed"
                logger.error(f"❌ {error_msg}")
                self.database.mark_error(db_event.id, error_msg)
                return
            
            self.database.update_mint_tx(db_event.id, mint_tx)
            logger.info(f"✅ BLUB minted: {mint_tx}")
            
            # Wait a moment for transaction to settle
            await asyncio.sleep(2)
            
            # Step 2: Call stake_minted_blub()
            logger.info(f"📝 Step 2: Calling stake_minted_blub()...")
            stake_tx = await self.stake_blub_with_retry(user, lock_index, blub_amount)
            
            if not stake_tx:
                error_msg = "stake_minted_blub invocation failed"
                logger.error(f"❌ {error_msg}")
                self.database.mark_error(db_event.id, error_msg)
                return
            
            self.database.update_stake_tx(db_event.id, stake_tx)
            logger.info(f"✅ BLUB staked: {stake_tx}")
            
            logger.info("="*60)
            logger.info(f"🎉 Successfully processed lock event #{lock_index}")
            logger.info(f"   ✓ Minted: {blub_amount/10000000:.2f} BLUB")
            logger.info(f"   ✓ Staked: {blub_amount * 10/11 / 10000000:.2f} BLUB")
            logger.info(f"   ✓ To LP: {blub_amount / 11 / 10000000:.2f} BLUB")
            logger.info("="*60)
            
        except Exception as e:
            logger.error(f"❌ Error processing event: {e}", exc_info=True)
            if 'db_event' in locals():
                self.database.mark_error(db_event.id, str(e))
    
    async def mint_blub_with_retry(
        self, 
        aqua_amount: int, 
        lock_index: int, 
        user_address: str
    ) -> Optional[str]:
        """Mint BLUB with retry logic"""
        logger.info("=" * 70)
        logger.info("🔄 MINT WITH RETRY LOGIC")
        logger.info("=" * 70)
        logger.info(f"🎯 Target: {aqua_amount/10000000:.2f} AQUA → {aqua_amount*1.1/10000000:.2f} BLUB")
        logger.info(f"🔄 Max attempts: {Config.MAX_RETRIES}")
        logger.info("=" * 70)
        
        for attempt in range(Config.MAX_RETRIES):
            try:
                logger.info(f"\n🔄 Attempt {attempt + 1}/{Config.MAX_RETRIES}")
                logger.info("-" * 70)
                
                tx_hash = await self.blub_minter.mint_for_lock(
                    aqua_amount=aqua_amount,
                    lock_index=lock_index,
                    user_address=user_address
                )
                
                if tx_hash:
                    logger.info("-" * 70)
                    logger.info(f"✅ MINT SUCCESSFUL on attempt {attempt + 1}")
                    logger.info("=" * 70)
                    return tx_hash
                else:
                    logger.warning(f"⚠️  Attempt {attempt + 1} returned None")
                
            except Exception as e:
                logger.error("-" * 70)
                logger.error(f"❌ Mint attempt {attempt + 1}/{Config.MAX_RETRIES} FAILED")
                logger.error(f"❌ Error type: {type(e).__name__}")
                logger.error(f"❌ Error: {str(e)}")
                logger.error("-" * 70)
            
            if attempt < Config.MAX_RETRIES - 1:
                logger.info(f"⏳ Retrying in {Config.RETRY_DELAY}s...")
                await asyncio.sleep(Config.RETRY_DELAY)
            else:
                logger.error("=" * 70)
                logger.error(f"❌ ALL {Config.MAX_RETRIES} MINT ATTEMPTS FAILED")
                logger.error("=" * 70)
        
        return None
    
    async def stake_blub_with_retry(
        self,
        user_address: str,
        lock_index: int,
        blub_amount: int
    ) -> Optional[str]:
        """Call stake_minted_blub with retry logic"""
        logger.info("=" * 70)
        logger.info("🔄 STAKE WITH RETRY LOGIC")
        logger.info("=" * 70)
        logger.info(f"🎯 User: {user_address[:20]}...")
        logger.info(f"🎯 Lock index: {lock_index}")
        logger.info(f"🎯 BLUB amount: {blub_amount/10000000:.2f}")
        logger.info(f"🔄 Max attempts: {Config.MAX_RETRIES}")
        logger.info("=" * 70)
        
        for attempt in range(Config.MAX_RETRIES):
            try:
                logger.info(f"\n🔄 Attempt {attempt + 1}/{Config.MAX_RETRIES}")
                logger.info("-" * 70)
                
                tx_hash = await self.contract_invoker.stake_minted_blub(
                    user_address=user_address,
                    lock_index=lock_index,
                    blub_amount=blub_amount
                )
                
                if tx_hash:
                    logger.info("-" * 70)
                    logger.info(f"✅ STAKE SUCCESSFUL on attempt {attempt + 1}")
                    logger.info("=" * 70)
                    return tx_hash
                else:
                    logger.warning(f"⚠️  Attempt {attempt + 1} returned None")
                
            except Exception as e:
                logger.error("-" * 70)
                logger.error(f"❌ Stake attempt {attempt + 1}/{Config.MAX_RETRIES} FAILED")
                logger.error(f"❌ Error type: {type(e).__name__}")
                logger.error(f"❌ Error: {str(e)}")
                logger.error("-" * 70)
            
            if attempt < Config.MAX_RETRIES - 1:
                logger.info(f"⏳ Retrying in {Config.RETRY_DELAY}s...")
                await asyncio.sleep(Config.RETRY_DELAY)
            else:
                logger.error("=" * 70)
                logger.error(f"❌ ALL {Config.MAX_RETRIES} STAKE ATTEMPTS FAILED")
                logger.error("=" * 70)
        
        return None
    
    def handle_shutdown(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"📡 Received signal {signum}, initiating shutdown...")
        self.running = False
    
    async def shutdown(self):
        """Cleanup and shutdown"""
        logger.info("👋 Shutting down bot...")
        self.event_listener.stop()
        logger.info("✅ Bot shutdown complete")


async def main():
    """Main entry point"""
    logger.info("="*60)
    logger.info("🤖 Soroban Staking Bot")
    logger.info("   Monitoring AQUA locks and minting BLUB tokens")
    logger.info("="*60)
    
    bot = StakingBot()
    await bot.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Bot stopped by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}", exc_info=True)
        sys.exit(1)

