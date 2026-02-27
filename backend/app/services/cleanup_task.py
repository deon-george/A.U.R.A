
import asyncio
import logging
from app.db.aura_modules import AuraModulesDB

logger = logging.getLogger(__name__)


#------This Function cleans up stale modules---------
async def cleanup_stale_modules(aura_modules_db: AuraModulesDB):
    logger.info("Starting stale module cleanup task")

    while True:
        try:
            await asyncio.sleep(60)  

            
            count = await aura_modules_db.mark_stale_modules_offline(
                timeout_seconds=120
            )

            if count > 0:
                logger.info(f"Marked {count} stale module(s) as offline")

        except asyncio.CancelledError:
            logger.info("Cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}", exc_info=True)
            
