
import logging
import os
from typing import List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"  


#------This Function summarizes conversation---------
async def summarize_conversation(messages: List[dict]) -> str:
    
    if not settings.groq_api_key:
        logger.warning("Groq API key not configured, using fallback summarization")
        return _fallback_summarize(messages)
    
    
    conversation_text = _build_conversation_text(messages)
    
    
    system_prompt = """You are a helpful AI assistant that summarizes conversations for a personal journal.
Your task is to create a brief (2-4 sentences) summary of the conversation that captures:
1. Key topics discussed
2. Important information shared by the user
3. Any reminders, tasks, or action items mentioned
4. The emotional tone if detectable (e.g., happy, concerned, excited, sad)

Be concise and focus on what matters for personal reflection. Write in a neutral, informative style."""

    user_prompt = f"""Please summarize this conversation in 2-4 sentences:

{conversation_text}

Summary:"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.3,  
                    "max_tokens": 150,  
                },
            )
            
            if response.status_code == 200:
                data = response.json()
                summary = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                
                if summary:
                    logger.info("Successfully generated conversation summary")
                    return summary
                else:
                    logger.warning("Empty summary returned from Groq, using fallback")
                    return _fallback_summarize(messages)
            else:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                return _fallback_summarize(messages)
                
    except httpx.TimeoutException:
        logger.error("Groq API request timed out, using fallback summarization")
        return _fallback_summarize(messages)
    except Exception as e:
        logger.error(f"Error calling Groq API: {str(e)}, using fallback summarization")
        return _fallback_summarize(messages)


#------This Function builds conversation text---------
def _build_conversation_text(messages: List[dict]) -> str:
    lines = []
    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        if content:
            
            role_label = role.capitalize()
            if role == "user":
                role_label = "User"
            elif role == "assistant":
                role_label = "Orito (AI Companion)"
            elif role == "system":
                role_label = "System"
            lines.append(f"{role_label}: {content}")
    
    return "\n".join(lines)


#------This Function provides fallback summarization---------
def _fallback_summarize(messages: List[dict]) -> str:
    if not messages:
        return "A brief AI conversation took place."
    
    
    user_messages = []
    assistant_messages = []
    
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "").strip()
        if content:
            if role == "user":
                user_messages.append(content)
            elif role == "assistant":
                assistant_messages.append(content)
    
    
    topics = []
    reminders = []
    emotions = []
    
    
    keywords = {
        "health": ["health", "doctor", "medicine", "pain", "symptom", "feeling"],
        "reminder": ["remind", "reminder", "schedule", "appointment", "don't forget"],
        "emotion": ["happy", "sad", "worried", "excited", "anxious", "tired", "good", "bad"],
        "family": ["family", "mom", "dad", "son", "daughter", "wife", "husband", "relative"],
    }
    
    all_text = " ".join(user_messages + assistant_messages).lower()
    
    for category, words in keywords.items():
        for word in words:
            if word in all_text:
                if category == "reminder":
                    reminders.append(word)
                elif category == "emotion":
                    emotions.append(word)
                else:
                    topics.append(word)
    
    
    summary_parts = []
    
    if topics:
        unique_topics = list(set(topics))[:3]
        summary_parts.append(f"Discussed: {', '.join(unique_topics)}")
    
    if reminders:
        summary_parts.append("Tasks/reminders noted")
    
    if emotions:
        unique_emotions = list(set(emotions))[:2]
        summary_parts.append(f"Emotionally: {', '.join(unique_emotions)}")
    
    
    total_messages = len(messages)
    if total_messages > 1:
        summary_parts.append(f"({total_messages} messages exchanged)")
    
    if summary_parts:
        return ". ".join(summary_parts) + "."
    else:
        return "A brief conversation with Orito the AI companion."
