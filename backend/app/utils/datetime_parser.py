
from typing import Optional
from datetime import datetime
import dateparser


#------This Function parses datetime from text---------
def parse_datetime_from_text(
    text: str, reference_datetime: Optional[datetime] = None
) -> Optional[datetime]:
    if not text:
        return None

    settings = {
        "PREFER_DATES_FROM": "future",  
        "RELATIVE_BASE": reference_datetime or datetime.utcnow(),
        "RETURN_AS_TIMEZONE_AWARE": False,
    }

    try:
        parsed_dt = dateparser.parse(text, settings=settings)
        return parsed_dt
    except Exception:
        return None
