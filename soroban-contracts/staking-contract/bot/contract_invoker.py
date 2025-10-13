import logging
from typing import Optional
from stellar_sdk import (
    Keypair,
    SorobanServer,
    TransactionBuilder,
    xdr as stellar_xdr,
    scval,
)
from stellar_sdk.soroban_rpc import (
    SendTransactionStatus,
    GetTransactionStatus,
)
from config import Config

logger = logging.getLogger(__name__)


class ContractInvoker:
    def __init__(self):
        logger.info("=" * 70)
        logger.info("📝 INITIALIZING CONTRACT INVOKER")
        logger.info("=" * 70)
        
        self.config = Config
        logger.info(f"📡 Soroban RPC: {self.config.SOROBAN_RPC_URL}")
        self.soroban_server = SorobanServer(self.config.SOROBAN_RPC_URL)
        
        logger.info(f"🔑 Loading admin keypair...")
        self.admin_keypair = Keypair.from_secret(self.config.ADMIN_SECRET_KEY)
        logger.info(f"   ✓ Admin account: {self.admin_keypair.public_key}")
        
        logger.info(f"📝 Staking contract: {self.config.STAKING_CONTRACT_ID[:20]}...")
        
        logger.info("=" * 70)
        logger.info("✅ CONTRACT INVOKER INITIALIZED")
        logger.info("=" * 70)
    
    async def stake_minted_blub(
        self,
        user_address: str,
        lock_index: int,
        blub_amount: int
    ) -> Optional[str]:
        try:
            logger.info("=" * 70)
            logger.info("📝 CALLING STAKE_MINTED_BLUB")
            logger.info("=" * 70)
            logger.info(f"👤 User: {user_address}")
            logger.info(f"🔢 Lock Index: {lock_index}")
            logger.info(f"💎 BLUB Amount: {blub_amount/10000000:.2f} BLUB ({blub_amount} stroops)")
            logger.info(f"📝 Contract: {self.config.STAKING_CONTRACT_ID[:20]}...")
            logger.info(f"🔑 Admin: {self.admin_keypair.public_key}")
            
            # Load admin account
            logger.info("🔍 Step 1: Loading admin account...")
            admin_account = self.soroban_server.load_account(self.admin_keypair.public_key)
            logger.info(f"   ✓ Sequence: {admin_account.sequence}")
            
            # Build function arguments
            logger.info("🔍 Step 2: Building function arguments...")
            logger.info(f"   ↳ admin: {self.admin_keypair.public_key}")
            logger.info(f"   ↳ user: {user_address}")
            logger.info(f"   ↳ aqua_lock_index: {lock_index}")
            logger.info(f"   ↳ total_blub_amount: {blub_amount}")
            
            # stake_minted_blub(admin: Address, user: Address, aqua_lock_index: u32, total_blub_amount: i128)
            args = [
                scval.to_address(self.admin_keypair.public_key),  # admin
                scval.to_address(user_address),                    # user
                scval.to_uint32(lock_index),                       # aqua_lock_index
                scval.to_int128(blub_amount)                       # total_blub_amount
            ]
            
            # Build transaction
            logger.info("🔍 Step 3: Building transaction...")
            tx = (
                TransactionBuilder(admin_account, self.config.NETWORK_PASSPHRASE, base_fee=50000)
                .add_time_bounds(0, 0)
                .append_invoke_contract_function_op(
                    contract_id=self.config.STAKING_CONTRACT_ID,
                    function_name='stake_minted_blub',
                    parameters=args,
                    source=self.admin_keypair.public_key,
                )
                .build()
            )
            logger.info(f"   ✓ TX hash: {tx.hash().hex()[:16]}...")
            
            # Simulate transaction
            logger.info("🔍 Step 4: Simulating transaction...")
            simulate_tx_data = self.soroban_server.simulate_transaction(tx)
            
            if simulate_tx_data.error:
                logger.error(f"   ❌ Simulation failed: {simulate_tx_data.error}")
                return None
            
            if simulate_tx_data.results is None:
                logger.error(f"   ❌ Simulation returned no results")
                return None
                
            logger.info(f"   ✓ Simulation successful")
            
            # Prepare transaction with auth
            logger.info("🔍 Step 5: Preparing transaction with auth...")
            tx = self.soroban_server.prepare_transaction(tx, simulate_tx_data)
            logger.info(f"   ✓ Transaction prepared")
            
            # Sign transaction
            logger.info("🔍 Step 6: Signing transaction...")
            tx.sign(self.admin_keypair)
            logger.info(f"   ✓ Signed with admin key")
            
            # Send transaction
            logger.info("🔍 Step 7: Sending transaction...")
            send_response = self.soroban_server.send_transaction(tx)
            
            logger.info(f"   ✓ Transaction sent")
            logger.info(f"   ↳ Status: {send_response.status}")
            logger.info(f"   ↳ Hash: {send_response.hash}")
            
            # Check send status
            if send_response.status == SendTransactionStatus.ERROR:
                logger.error("   ❌ Transaction rejected by network")
                if hasattr(send_response, 'error_result_xdr'):
                    logger.error(f"   ❌ Error XDR: {send_response.error_result_xdr}")
                return None
            elif send_response.status == SendTransactionStatus.DUPLICATE:
                logger.warning("   ⚠️  Duplicate transaction detected")
                # Still try to get the result
            elif send_response.status != SendTransactionStatus.PENDING:
                logger.error(f"   ❌ Unexpected status: {send_response.status}")
                return None
            
            # Poll for transaction confirmation
            logger.info("🔍 Step 8: Waiting for confirmation...")
            tx_hash = send_response.hash
            
            return await self._wait_for_transaction(tx_hash, user_address, lock_index, blub_amount)
            
        except Exception as e:
            logger.error("=" * 70)
            logger.error("❌ EXCEPTION IN STAKE_MINTED_BLUB")
            logger.error("=" * 70)
            logger.error(f"   ❌ Error: {e}")
            logger.error(f"   ❌ Type: {type(e).__name__}")
            logger.error(f"   ❌ Full traceback:", exc_info=True)
            logger.error("=" * 70)
            return None
    
    async def _wait_for_transaction(
        self,
        tx_hash: str,
        user_address: str,
        lock_index: int,
        blub_amount: int,
        max_attempts: int = 30,
        poll_interval: int = 2
    ) -> Optional[str]:
        
        import asyncio
        
        logger.info(f"   ↳ Polling for confirmation (max {max_attempts} attempts)...")
        
        for attempt in range(1, max_attempts + 1):
            try:
                logger.debug(f"      Poll attempt {attempt}/{max_attempts}...")
                
                # Get transaction status
                get_tx_response = self.soroban_server.get_transaction(tx_hash)
                
                status = get_tx_response.status
                logger.debug(f"      Status: {status}")
                
                if status == GetTransactionStatus.SUCCESS:
                    logger.info("=" * 70)
                    logger.info("✅ STAKE_MINTED_BLUB CONFIRMED")
                    logger.info("=" * 70)
                    logger.info(f"📝 TX Hash: {tx_hash}")
                    logger.info(f"👤 User: {user_address[:10]}...")
                    logger.info(f"🔢 Lock: #{lock_index}")
                    logger.info(f"💎 BLUB: {blub_amount/10000000:.2f}")
                    logger.info(f"⏱️  Confirmed in {attempt} poll(s) ({attempt * poll_interval}s)")
                    logger.info("=" * 70)
                    return tx_hash
                
                elif status == GetTransactionStatus.FAILED:
                    logger.error("=" * 70)
                    logger.error("❌ TRANSACTION FAILED")
                    logger.error("=" * 70)
                    logger.error(f"   ❌ TX Hash: {tx_hash}")
                    
                    # Try to extract error details
                    if hasattr(get_tx_response, 'result_xdr') and get_tx_response.result_xdr:
                        try:
                            import base64
                            result_bytes = base64.b64decode(get_tx_response.result_xdr)
                            result = stellar_xdr.TransactionResult.from_xdr_bytes(result_bytes)
                            logger.error(f"   ❌ Result code: {result.result.code}")
                            
                            if hasattr(result.result, 'results') and result.result.results:
                                for idx, op_result in enumerate(result.result.results):
                                    if hasattr(op_result, 'tr') and hasattr(op_result.tr, 'invoke_host_function_result'):
                                        invoke_result = op_result.tr.invoke_host_function_result
                                        logger.error(f"   ❌ Operation {idx}: {invoke_result.code}")
                        except Exception as decode_err:
                            logger.debug(f"      Could not decode result XDR: {decode_err}")
                    
                    logger.error("=" * 70)
                    logger.error("   💡 Possible causes:")
                    logger.error("   - BLUB not yet in staking contract")
                    logger.error("   - Lock index doesn't exist")
                    logger.error("   - BLUB already staked for this lock")
                    logger.error("   - Admin authorization failed")
                    logger.error("=" * 70)
                    return None
                
                elif status == GetTransactionStatus.NOT_FOUND:
                    logger.debug(f"      Transaction not found yet, waiting...")
                    
                else:
                    logger.warning(f"      Unknown status: {status}, continuing...")
                
                # Wait before next poll
                if attempt < max_attempts:
                    await asyncio.sleep(poll_interval)
                
            except Exception as poll_error:
                logger.warning(f"      Poll error (attempt {attempt}): {poll_error}")
                
                if attempt < max_attempts:
                    await asyncio.sleep(poll_interval)
                else:
                    logger.error("=" * 70)
                    logger.error("❌ POLLING FAILED")
                    logger.error("=" * 70)
                    logger.error(f"   ❌ Max attempts ({max_attempts}) reached")
                    logger.error(f"   ❌ Last error: {poll_error}")
                    logger.error("=" * 70)
                    return None
        
        # Timeout reached
        logger.error("=" * 70)
        logger.error("⏱️  TRANSACTION TIMEOUT")
        logger.error("=" * 70)
        logger.error(f"   ⏱️  TX Hash: {tx_hash}")
        logger.error(f"   ⏱️  Exceeded {max_attempts} attempts ({max_attempts * poll_interval}s)")
        logger.error(f"   ⏱️  Transaction may still complete - check manually")
        logger.error("=" * 70)
        return None


async def main():
    """Test contract invoker"""
    import asyncio
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    invoker = ContractInvoker()
    
    # Test invocation
    test_user = "GTEST123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"
    test_lock_index = 0
    test_blub = 11 * 10000000
    
    logger.info("=" * 70)
    logger.info("🧪 TESTING CONTRACT INVOKER")
    logger.info("=" * 70)
    
    tx_hash = await invoker.stake_minted_blub(
        user_address=test_user,
        lock_index=test_lock_index,
        blub_amount=test_blub
    )
    
    if tx_hash:
        logger.info("=" * 70)
        logger.info(f"✅ Test successful: {tx_hash}")
        logger.info("=" * 70)
    else:
        logger.error("=" * 70)
        logger.error("❌ Test failed")
        logger.error("=" * 70)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
