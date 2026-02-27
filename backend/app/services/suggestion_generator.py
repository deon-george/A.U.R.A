
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import httpx
from ..models.suggestion import Suggestion, SuggestionType
from ..models.medication import Medication
from ..models.journal import JournalEntry
from ..models.user import User


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


class SuggestionGenerator:

    def __init__(self):
        self.api_key = GROQ_API_KEY

#------This Function generates daily suggestions---------
    async def generate_daily_suggestions(
        self,
        user_id: str,
        medications: List[Medication],
        recent_journals: List[JournalEntry],
        patient_info: Optional[Dict] = None,
    ) -> List[Suggestion]:

        if not self.api_key:
            return []

        
        context = self._build_context(medications, recent_journals, patient_info)

        
        suggestions_data = await self._call_groq_api(context)

        if not suggestions_data:
            return []

        
        suggestions = []
        for suggestion_dict in suggestions_data:
            suggestion = Suggestion(
                user_id=user_id,
                type=self._map_type(suggestion_dict.get("type", "general")),
                title=suggestion_dict.get("title", "Suggestion"),
                description=suggestion_dict.get("description", ""),
                priority=suggestion_dict.get("priority", "medium"),
                action_label=suggestion_dict.get("action_label"),
                context_data=suggestion_dict.get("context_data", {}),
                expires_at=datetime.utcnow() + timedelta(days=1),  
            )
            suggestions.append(suggestion)

        return suggestions

#------This Function builds context---------
    def _build_context(
        self,
        medications: List[Medication],
        recent_journals: List[JournalEntry],
        patient_info: Optional[Dict],
    ) -> str:

        context_parts = []

        
        if patient_info:
            context_parts.append(f"PATIENT INFORMATION:")
            context_parts.append(
                f"Condition: {patient_info.get('condition', 'Unknown')}"
            )
            context_parts.append(f"Severity: {patient_info.get('severity', 'Unknown')}")
            context_parts.append(f"Notes: {patient_info.get('notes', 'None')}")
            context_parts.append("")

        
        if medications:
            context_parts.append(f"CURRENT MEDICATIONS ({len(medications)}):")
            for med in medications[:10]:  
                schedule = (
                    ", ".join(med.schedule_times)
                    if med.schedule_times
                    else "No schedule"
                )
                context_parts.append(f"- {med.name} ({med.dosage}) - {schedule}")
            context_parts.append("")

        
        if recent_journals:
            context_parts.append(f"RECENT JOURNAL ENTRIES ({len(recent_journals)}):")
            for entry in recent_journals[:5]:  
                date_str = (
                    entry.created_at.strftime("%Y-%m-%d")
                    if entry.created_at
                    else "Unknown"
                )
                content_preview = (
                    entry.content[:100] + "..."
                    if len(entry.content) > 100
                    else entry.content
                )
                context_parts.append(f"- [{date_str}] {content_preview}")
            context_parts.append("")

        
        now = datetime.now()
        context_parts.append(f"CURRENT TIME:")
        context_parts.append(f"Date: {now.strftime('%A, %B %d, %Y')}")
        context_parts.append(f"Time: {now.strftime('%I:%M %p')}")

        return "\n".join(context_parts)

#------This Function calls Groq API---------
    async def _call_groq_api(self, context: str) -> Optional[List[Dict]]:

        system_prompt = """You are an empathetic medical AI assistant specialized in helping Alzheimer's patients.
Generate 2-4 daily suggestions that are:
- Specific and actionable
- Personalized to the patient's context
- Caring and encouraging
- Time-appropriate

Each suggestion should have:
- type: one of [medication, activity, wellness, reminder, routine, general]
- title: Short, clear title (2-5 words)
- description: 1-2 sentences describing the suggestion
- priority: high, medium, or low
- action_label: Optional action button text (e.g., "Take Now", "Start Activity", "View Details")

Return ONLY valid JSON array format:
[
  {
    "type": "activity",
    "title": "Morning Walk",
    "description": "Take a 15-minute walk to help with medication absorption and mood.",
    "priority": "medium",
    "action_label": "Start Walk"
  }
]"""
        type_mapping = {
            "medication": SuggestionType.MEDICATION,
            "activity": SuggestionType.ACTIVITY,
            "wellness": SuggestionType.WELLNESS,
            "reminder": SuggestionType.REMINDER,
            "routine": SuggestionType.ROUTINE,
            "general": SuggestionType.GENERAL,
        }
        return type_mapping.get(type_str.lower(), SuggestionType.GENERAL)



suggestion_generator = SuggestionGenerator()
