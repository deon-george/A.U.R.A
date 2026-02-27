
from app.models.user import User, UserRole


#------This Function checks patient access---------
async def check_patient_access(uid: str, patient_uid: str) -> bool:
    try:
        user = await User.find_one(User.firebase_uid == uid)
        if not user:
            return False
        
        
        if user.role == UserRole.ADMIN:
            return True
        
        
        if uid == patient_uid:
            return True
        
        
        if user.role == UserRole.CAREGIVER and patient_uid in user.linked_patients:
            return True
        
        return False
    except Exception:
        return False
