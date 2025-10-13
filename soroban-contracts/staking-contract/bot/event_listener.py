import asyncio
import logging
from typing import List, Dict, Optional
import requests
import json
from stellar_sdk import Server, Keypair, SorobanServer
from stellar_sdk.soroban_rpc import EventFilter, EventFilterType
from stellar_sdk.xdr import SCVal
from config import Config

logger = logging.getLogger(__name__)


class StakingEventListener:
    def __init__(self):
        logger.info("=" * 70)
        logger.info("🔍 INITIALIZING EVENT LISTENER")
        logger.info("=" * 70)
        
        self.config = Config
        logger.info(f"📡 Connecting to Soroban RPC: {self.config.SOROBAN_RPC_URL}")
        self.soroban_server = SorobanServer(self.config.SOROBAN_RPC_URL)
        
        logger.info(f"📡 Connecting to Horizon: {self.config.HORIZON_URL}")
        self.horizon_server = Server(horizon_url=self.config.HORIZON_URL)
        
        self.running = False
        
        # Initialize last_processed_ledger
        logger.info("📊 Determining starting ledger...")
        if self.config.START_LEDGER == 0:
            # Start from latest ledger
            logger.info("   ↳ START_LEDGER=0, fetching latest ledger...")
            self.last_processed_ledger = self.get_latest_ledger()
            logger.info(f"   ✓ Starting from latest ledger: {self.last_processed_ledger}")
        else:
            self.last_processed_ledger = self.config.START_LEDGER
            logger.info(f"   ✓ Starting from configured ledger: {self.last_processed_ledger}")
        
        logger.info("=" * 70)
        logger.info("✅ EVENT LISTENER INITIALIZED")
        logger.info("=" * 70)
        
    async def start(self):
        logger.info("Starting event listener...")
        logger.info(f"Monitoring contract: {self.config.STAKING_CONTRACT_ID}")
        
        self.running = True
        
        while self.running:
            try:
                await self.poll_events()
                await asyncio.sleep(self.config.POLL_INTERVAL)
            except Exception as e:
                logger.error(f"Error in event listener: {e}", exc_info=True)
                await asyncio.sleep(self.config.RETRY_DELAY)
    
    def stop(self):
        logger.info("Stopping event listener...")
        self.running = False
    
    def get_latest_ledger(self) -> int:
        try:
            logger.debug("   ↳ Fetching latest ledger from Soroban RPC...")
            response = self.soroban_server.get_latest_ledger()
            logger.debug(f"   ✓ Latest ledger: {response.sequence}")
            return response.sequence
        except Exception as e:
            logger.error(f"❌ Error getting latest ledger: {e}")
            logger.error(f"   ↳ Exception type: {type(e).__name__}")
            logger.error(f"   ↳ Exception details: {str(e)}")
            return 0
    
    async def poll_events(self):
        try:
            logger.debug("=" * 70)
            logger.debug("👂 POLLING FOR NEW EVENTS")
            logger.debug("=" * 70)
            
            logger.debug(f"🔍 Step 1: Getting current ledger...")
            current_ledger = self.get_latest_ledger()
            logger.debug(f"   ✓ Current ledger: {current_ledger}")
            logger.debug(f"   ✓ Last processed: {self.last_processed_ledger}")
            
            if current_ledger <= self.last_processed_ledger:
                logger.debug("   ℹ️  No new ledgers to check")
                return []
            
            ledger_range = current_ledger - self.last_processed_ledger
            logger.info(f"🔍 Step 2: Checking {ledger_range} new ledger(s) ({self.last_processed_ledger + 1} to {current_ledger})")
            
            # Get events from the contract
            logger.debug(f"🔍 Step 3: Fetching contract events...")
            events = self.get_contract_events(
                self.last_processed_ledger + 1,
                current_ledger
            )
            
            if events:
                logger.info(f"✅ Found {len(events)} new event(s)")
                for idx, event in enumerate(events):
                    logger.info(f"   Event {idx+1}: Lock #{event.get('lock_index')} for {event.get('user', 'unknown')[:10]}...")
                return events
            else:
                logger.debug(f"   ℹ️  No lock events found")
            
            logger.debug(f"🔍 Step 4: Updating last processed ledger to {current_ledger}")
            self.last_processed_ledger = current_ledger
            
        except Exception as e:
            logger.error("=" * 70)
            logger.error("❌ ERROR IN POLL_EVENTS")
            logger.error("=" * 70)
            logger.error(f"❌ Error type: {type(e).__name__}")
            logger.error(f"❌ Error message: {str(e)}")
            logger.error(f"❌ Full traceback:", exc_info=True)
            logger.error("=" * 70)
        
        return []
    
    def get_contract_events(
        self, 
        start_ledger: int, 
        end_ledger: Optional[int] = None
    ) -> List[Dict]:
        try:
            logger.debug("   ↳ Building getEvents RPC request...")
            # Make direct HTTP request to Soroban RPC to bypass SDK validation issues
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getEvents",
                "params": {
                    "startLedger": start_ledger,
                    "filters": [
                        {
                            "type": "contract",
                            "contractIds": [self.config.STAKING_CONTRACT_ID]
                        }
                    ],
                    "pagination": {
                        "limit": self.config.BATCH_SIZE
                    }
                }
            }
            
            logger.debug(f"   ↳ Sending request to: {self.config.SOROBAN_RPC_URL}")
            logger.debug(f"   ↳ Contract ID: {self.config.STAKING_CONTRACT_ID[:20]}...")
            logger.debug(f"   ↳ Ledger range: {start_ledger}")
            
            response = requests.post(
                self.config.SOROBAN_RPC_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            logger.debug(f"   ↳ Response status: {response.status_code}")
            response.raise_for_status()
            
            data = response.json()
            
            if "result" not in data or "events" not in data["result"]:
                logger.debug("   ℹ️  No events found in response")
                if "error" in data:
                    logger.error(f"   ❌ RPC Error: {data['error']}")
                return []
            
            raw_events_count = len(data["result"]["events"])
            logger.debug(f"   ✓ Received {raw_events_count} raw event(s) from RPC")
            
            events = []
            for idx, event in enumerate(data["result"]["events"]):
                try:
                    logger.debug(f"   ↳ Parsing event {idx+1}/{raw_events_count}...")
                    # Log raw event for debugging
                    logger.debug(f"      Raw event: {json.dumps(event, indent=2)}")
                    
                    parsed_event = self.parse_event(event)
                    if parsed_event:
                        logger.debug(f"      ✓ Parsed successfully")
                        events.append(parsed_event)
                    else:
                        logger.debug(f"      ℹ️  Not a 'lock' event, skipping")
                except Exception as e:
                    logger.error(f"      ❌ Error parsing event {idx+1}: {e}")
                    logger.debug(f"      Failed event data: {json.dumps(event, indent=2)}")
            
            logger.debug(f"   ✓ Successfully parsed {len(events)} 'lock' event(s)")
            return events
            
        except requests.exceptions.ConnectionError as e:
            logger.error("=" * 70)
            logger.error("❌ CONNECTION ERROR")
            logger.error("=" * 70)
            logger.error(f"❌ Failed to connect to Soroban RPC: {self.config.SOROBAN_RPC_URL}")
            logger.error(f"❌ Error: {str(e)}")
            logger.error("   ↳ Check if the RPC endpoint is accessible")
            logger.error("   ↳ Check your network connection")
            logger.error("=" * 70)
            return []
        except requests.exceptions.Timeout as e:
            logger.error("=" * 70)
            logger.error("❌ TIMEOUT ERROR")
            logger.error("=" * 70)
            logger.error(f"❌ Request timed out after 30 seconds")
            logger.error(f"❌ Error: {str(e)}")
            logger.error("=" * 70)
            return []
        except Exception as e:
            logger.error("=" * 70)
            logger.error("❌ ERROR IN GET_CONTRACT_EVENTS")
            logger.error("=" * 70)
            logger.error(f"❌ Error type: {type(e).__name__}")
            logger.error(f"❌ Error message: {str(e)}")
            logger.error(f"❌ Full traceback:", exc_info=True)
            logger.error("=" * 70)
            return []
    
    def parse_event(self, event) -> Optional[Dict]:
        try:
            logger.debug("         ↳ Extracting event type from topic...")
            
            topic = event.get("topic", [])
            if not topic or not self.is_lock_event(topic):
                logger.debug("         ↳ Not a 'lock' event, skipping")
                return None
            
            logger.debug("         ✓ Confirmed as 'lock' event")
            logger.debug("         ↳ Parsing event value data...")
            
            value_data = event.get("value", {})
            
            if isinstance(value_data, str):
                logger.debug("         ↳ Value is base64-encoded XDR string")
                parsed = self.parse_xdr_value_string(value_data)
            else:
                logger.debug("         ↳ Value is parsed dict")
                parsed = self.parse_lock_event_value(value_data)
            
            if not parsed:
                logger.debug("         ❌ Failed to parse event value")
                return None
            
            logger.debug("         ✓ Event value parsed successfully")
            
            parsed["ledger"] = event.get("ledger", 0)
            parsed["transaction_hash"] = event.get("id", "").split("-")[0] if event.get("id") else ""
            
            logger.info(f"📊 Parsed lock event: User={parsed.get('user', 'unknown')[:8]}..., "
                       f"Amount={parsed.get('amount', 0)/10000000:.2f} AQUA, "
                       f"Index={parsed.get('lock_index', 0)}")
            
            return parsed
            
        except Exception as e:
            logger.error("         ❌ Exception in parse_event:")
            logger.error(f"         ❌ Error type: {type(e).__name__}")
            logger.error(f"         ❌ Error message: {str(e)}")
            logger.error(f"         ❌ Full traceback:", exc_info=True)
            return None
    
    def is_lock_event(self, topic: List) -> bool:
        """Check if the event topic indicates this is a 'lock' event"""
        try:
            if not topic:
                return False
            
            first_topic = topic[0]
            
            if isinstance(first_topic, str):
                import base64
                try:
                    xdr_bytes = base64.b64decode(first_topic)
                    symbol_str = xdr_bytes.decode('utf-8', errors='ignore').strip('\x00')
                    symbol_clean = ''.join(c for c in symbol_str if c.isprintable())
                    logger.debug(f"         ↳ Decoded event symbol: {symbol_clean}")
                    return "lock" in symbol_clean
                except Exception as e:
                    logger.debug(f"         ↳ Error decoding base64 topic: {e}")
                    return False
            
            elif isinstance(first_topic, dict):
                if first_topic.get("type") == "symbol":
                    symbol_value = first_topic.get("value", "")
                    logger.debug(f"         ↳ Event symbol: {symbol_value}")
                    return symbol_value == "lock"
                elif first_topic.get("type") == "string":
                    string_value = first_topic.get("value", "")
                    logger.debug(f"         ↳ Event string: {string_value}")
                    return string_value == "lock"
            
            return False
        except Exception as e:
            logger.debug(f"Error checking lock event: {e}")
            return False
    
    def parse_xdr_value_string(self, value_b64: str) -> Optional[Dict]:
        """Parse base64-encoded XDR value string"""
        try:
            import base64
            from stellar_sdk import xdr as stellar_xdr
            
            xdr_bytes = base64.b64decode(value_b64)
            
            try:
                sc_val = stellar_xdr.SCVal.from_xdr_bytes(xdr_bytes)
                
                parsed = self.scval_to_dict(sc_val)
                return parsed
                
            except Exception as e:
                logger.error(f"         ❌ Error parsing XDR: {e}")
                return None
                
        except Exception as e:
            logger.error(f"Error decoding base64 value: {e}", exc_info=True)
            return None
    
    def scval_to_dict(self, sc_val) -> Optional[Dict]:
        """Convert SCVal to dictionary matching LockRecordedEvent structure"""
        try:
            from stellar_sdk.xdr import SCValType
            
            if sc_val.type == SCValType.SCV_MAP and sc_val.map:
                fields = {}
                for entry in sc_val.map.sc_map:
                    key = self.extract_scval_native(entry.key)
                    val = self.extract_scval_native(entry.val)
                    if key:
                        fields[key] = val
                
                logger.debug(f"         ↳ Extracted fields: {list(fields.keys())}")
                
                parsed = {
                    "user": str(fields.get("user", "")),
                    "amount": int(fields.get("amount", 0)) if fields.get("amount") else 0,
                    "duration_minutes": int(fields.get("duration_minutes", 0)) if fields.get("duration_minutes") else 0,
                    "reward_multiplier": int(fields.get("reward_multiplier", 0)) if fields.get("reward_multiplier") else 0,
                    "tx_hash": str(fields.get("tx_hash", "")),
                    "timestamp": int(fields.get("timestamp", 0)) if fields.get("timestamp") else 0,
                    "lock_index": int(fields.get("lock_index", 0)) if fields.get("lock_index") else 0,
                    "unlock_timestamp": int(fields.get("unlock_timestamp", 0)) if fields.get("unlock_timestamp") else 0
                }
                return parsed
            
            logger.debug(f"         ℹ️  SCVal is not a map, type: {sc_val.type}")
            return None
            
        except Exception as e:
            logger.error(f"Error converting SCVal to dict: {e}", exc_info=True)
            return None
    
    def extract_scval_native(self, sc_val):
        """Extract native Python value from SCVal"""
        try:
            from stellar_sdk import xdr as stellar_xdr, Address
            from stellar_sdk.xdr import SCValType
            
            if not sc_val:
                return None
            
            # Check the discriminant type
            sc_type = sc_val.type
            
            # Symbol
            if sc_type == SCValType.SCV_SYMBOL:
                return sc_val.sym.sc_symbol.decode('utf-8')
            
            # String
            elif sc_type == SCValType.SCV_STRING:
                return sc_val.str.sc_string.decode('utf-8')
            
            # U32
            elif sc_type == SCValType.SCV_U32:
                return int(sc_val.u32.uint32)
            
            # I32
            elif sc_type == SCValType.SCV_I32:
                return int(sc_val.i32.int32)
            
            # U64
            elif sc_type == SCValType.SCV_U64:
                return int(sc_val.u64.uint64)
            
            # I64
            elif sc_type == SCValType.SCV_I64:
                return int(sc_val.i64.int64)
            
            # U128
            elif sc_type == SCValType.SCV_U128:
                hi = int(sc_val.u128.hi.uint64)
                lo = int(sc_val.u128.lo.uint64)
                return (hi << 64) + lo
            
            # I128
            elif sc_type == SCValType.SCV_I128:
                hi = int(sc_val.i128.hi.int64)
                lo = int(sc_val.i128.lo.uint64)
                result = (hi << 64) + lo
                if hi < 0:
                    result = result - (1 << 128)
                return result
            
            # Bytes
            elif sc_type == SCValType.SCV_BYTES:
                return sc_val.bytes.sc_bytes.hex()
            
            # Address
            elif sc_type == SCValType.SCV_ADDRESS:
                try:
                    return Address.from_xdr_sc_address(sc_val.address).address
                except Exception as e:
                    logger.debug(f"Error parsing address: {e}")
                    return str(sc_val.address)
            
            else:
                logger.debug(f"Unsupported SCVal type: {sc_type}")
                return None
            
        except Exception as e:
            logger.debug(f"Error extracting SCVal: {e}")
            return None
    
    def parse_lock_event_value(self, value_data: Dict) -> Optional[Dict]:
        """Parse the lock event value from XDR format"""
        try:
            if not isinstance(value_data, dict):
                return None
            
            fields = {}
            
            if value_data.get("type") == "map":
                map_entries = value_data.get("value", [])
                for entry in map_entries:
                    key = self.extract_scval(entry.get("key", {}))
                    val = self.extract_scval(entry.get("val", {}))
                    if key:
                        fields[key] = val
            
            elif value_data.get("type") == "vec":
                vec_values = value_data.get("value", [])
                field_names = ["user", "amount", "duration_minutes", "reward_multiplier", 
                              "tx_hash", "timestamp", "lock_index", "unlock_timestamp"]
                for i, val in enumerate(vec_values):
                    if i < len(field_names):
                        fields[field_names[i]] = self.extract_scval(val)
            
            if not fields:
                logger.debug("No fields extracted from event value")
                return None
            
            parsed = {
                "user": str(fields.get("user", "")),
                "amount": int(fields.get("amount", 0)),
                "duration_minutes": int(fields.get("duration_minutes", 0)),
                "reward_multiplier": int(fields.get("reward_multiplier", 0)),
                "tx_hash": str(fields.get("tx_hash", "")),
                "timestamp": int(fields.get("timestamp", 0)),
                "lock_index": int(fields.get("lock_index", 0)),
                "unlock_timestamp": int(fields.get("unlock_timestamp", 0))
            }
            
            return parsed
            
        except Exception as e:
            logger.error(f"Error parsing lock event value: {e}", exc_info=True)
            return None
    
    def extract_scval(self, scval: Dict) -> any:
        """Extract a value from an SCVal XDR representation"""
        try:
            if not isinstance(scval, dict):
                return scval
            
            val_type = scval.get("type", "")
            value = scval.get("value")
            
            if val_type == "u32":
                return int(value) if value else 0
            elif val_type == "i32":
                return int(value) if value else 0
            elif val_type == "u64":
                return int(value) if value else 0
            elif val_type == "i64":
                return int(value) if value else 0
            elif val_type == "u128":
                if isinstance(value, dict):
                    hi = int(value.get("hi", 0))
                    lo = int(value.get("lo", 0))
                    return (hi << 64) + lo
                return int(value) if value else 0
            elif val_type == "i128":
                if isinstance(value, dict):
                    hi = int(value.get("hi", 0))
                    lo = int(value.get("lo", 0))
                    result = (hi << 64) + lo
                    if hi & 0x8000000000000000:
                        result = result - (1 << 128)
                    return result
                return int(value) if value else 0
            elif val_type == "symbol":
                return str(value) if value else ""
            elif val_type == "string":
                return str(value) if value else ""
            elif val_type == "bytes":
                return str(value) if value else ""
            elif val_type == "address":
                return str(value) if value else ""
            else:
                return value
                
        except Exception as e:
            logger.debug(f"Error extracting SCVal: {e}")
            return None
    
    def decode_address(self, address_data) -> str:
        """Decode Soroban address to Stellar address"""
        if isinstance(address_data, str):
            return address_data
        return str(address_data)


async def main():
    """Test the event listener"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    listener = StakingEventListener()
    
    try:
        await listener.start()
    except KeyboardInterrupt:
        listener.stop()
        logger.info("Event listener stopped by user")


if __name__ == "__main__":
    asyncio.run(main())