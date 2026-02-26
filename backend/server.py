from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from passlib.context import CryptContext
from jose import jwt, JWTError
import base64
import json
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'newschool_db')]

# Create the main app
app = FastAPI(title="New School API", version="1.0.0")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "newschool-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================= PUSH NOTIFICATIONS =======================

async def send_push_notification(push_token: str, title: str, body: str, data: dict = None):
    """Send push notification via Expo Push Service"""
    if not push_token or not push_token.startswith('ExponentPushToken'):
        return False
    
    message = {
        "to": push_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                }
            )
            logger.info(f"Push notification sent: {response.status_code}")
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return False

async def notify_event_creator(event_id: str, joiner_name: str):
    """Notify event creator when someone joins"""
    event = await db.events.find_one({"event_id": event_id})
    if not event:
        return
    
    creator = await db.users.find_one({"user_id": event["creator_id"]})
    if not creator or not creator.get("push_token"):
        return
    
    await send_push_notification(
        creator["push_token"],
        "Nouveau participant ! 🎉",
        f"{joiner_name} a rejoint votre New School \"{event['name']}\"",
        {"type": "join", "event_id": event_id}
    )

async def notify_chat_participants(event_id: str, sender_id: str, sender_name: str, message_preview: str):
    """Notify all participants except sender when a message is sent"""
    event = await db.events.find_one({"event_id": event_id})
    if not event:
        return
    
    for participant in event.get("participants", []):
        if participant["user_id"] == sender_id:
            continue
        
        user = await db.users.find_one({"user_id": participant["user_id"]})
        if not user or not user.get("push_token"):
            continue
        
        # Check if user has blocked the sender
        if sender_id in user.get("blocked_users", []):
            continue
        
        preview = message_preview[:50] + "..." if len(message_preview) > 50 else message_preview
        await send_push_notification(
            user["push_token"],
            f"{event['name']}",
            f"{sender_name}: {preview}",
            {"type": "message", "event_id": event_id}
        )

# ======================= MODELS =======================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    user_id: str
    email: str
    first_name: str
    photo: Optional[str] = None
    bio: Optional[str] = None
    languages: List[str] = []
    phone: Optional[str] = None
    subscription_tier: str = "free"
    events_created_this_month: int = 0
    events_joined_this_month: int = 0
    created_at: datetime
    is_verified: bool = False

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    photo: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[List[str]] = None
    phone: Optional[str] = None

class EventCreate(BaseModel):
    name: str
    description: str
    location_name: str
    latitude: float
    longitude: float
    max_participants: int = 10
    duration_hours: int = 2
    desired_nationalities: List[str] = []
    theme: Optional[str] = None
    photo: Optional[str] = None
    start_time: Optional[datetime] = None
    gender_filter: Optional[str] = None  # "all", "men", "women"
    age_range_min: Optional[int] = None
    age_range_max: Optional[int] = None

class EventResponse(BaseModel):
    event_id: str
    name: str
    description: str
    location_name: str
    latitude: float
    longitude: float
    max_participants: int
    current_participants: int
    duration_hours: int
    desired_nationalities: List[str]
    theme: Optional[str]
    photo: Optional[str]
    creator_id: str
    creator_name: str
    creator_photo: Optional[str]
    participants: List[Dict[str, Any]]
    status: str
    created_at: datetime
    start_time: Optional[datetime]
    is_full: bool
    gender_filter: Optional[str] = None
    age_range_min: Optional[int] = None
    age_range_max: Optional[int] = None

class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"  # text, audio, image, video

class MessageResponse(BaseModel):
    message_id: str
    event_id: str
    sender_id: str
    sender_name: str
    sender_photo: Optional[str]
    content: str
    message_type: str
    created_at: datetime
    is_read: bool = False

class ReportCreate(BaseModel):
    reported_id: str
    report_type: str  # user, event, message
    reason: str
    description: Optional[str] = None

class SubscriptionTier(BaseModel):
    tier: str  # discovery, explorer, ambassador
    price: float
    features: List[str]

class SubscriptionUpdate(BaseModel):
    tier: str

# ======================= AUTH HELPERS =======================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Then try Authorization header
    if not session_token and credentials:
        session_token = credentials.credentials
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a JWT token
    try:
        payload = jwt.decode(session_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        pass
    
    # Check session token in database (Google OAuth)
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ======================= AUTH ENDPOINTS =======================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register a new user with email/password"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "first_name": user_data.first_name,
        "phone": user_data.phone,
        "photo": None,
        "bio": None,
        "languages": [],
        "subscription_tier": "free",
        "events_created_this_month": 0,
        "events_joined_this_month": 0,
        "created_at": datetime.now(timezone.utc),
        "is_verified": False,
        "blocked_users": []
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"user_id": user_id})
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "first_name": user_data.first_name,
        "token": token
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    """Login with email/password"""
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    if not user.get("password") or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    # Check if user is banned
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Votre compte a été suspendu. Contactez le support pour plus d'informations.")
    
    token = create_access_token({"user_id": user["user_id"]})
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "token": token
    }

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange Emergent OAuth session_id for session data"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        oauth_data = resp.json()
    
    email = oauth_data.get("email")
    name = oauth_data.get("name", "User")
    picture = oauth_data.get("picture")
    session_token = oauth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"photo": picture, "first_name": name.split()[0] if name else "User"}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "first_name": name.split()[0] if name else "User",
            "photo": picture,
            "bio": None,
            "languages": [],
            "phone": None,
            "subscription_tier": "free",
            "events_created_this_month": 0,
            "events_joined_this_month": 0,
            "created_at": datetime.now(timezone.utc),
            "is_verified": True,
            "blocked_users": []
        }
        await db.users.insert_one(user_doc)
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "user_id": user_id,
        "email": email,
        "first_name": user.get("first_name", name),
        "photo": user.get("photo", picture),
        "token": session_token
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    user_data = {k: v for k, v in current_user.items() if k != "password"}
    return user_data

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, current_user: dict = Depends(get_current_user)):
    """Logout user"""
    await db.user_sessions.delete_one({"user_id": current_user["user_id"]})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# ======================= PUSH NOTIFICATIONS ENDPOINT =======================

class PushTokenUpdate(BaseModel):
    push_token: str

@api_router.post("/users/push-token")
async def update_push_token(token_data: PushTokenUpdate, current_user: dict = Depends(get_current_user)):
    """Register or update push notification token"""
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"push_token": token_data.push_token}}
    )
    return {"message": "Push token updated"}

@api_router.delete("/users/push-token")
async def remove_push_token(current_user: dict = Depends(get_current_user)):
    """Remove push notification token"""
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$unset": {"push_token": ""}}
    )
    return {"message": "Push token removed"}

# ======================= USER ENDPOINTS =======================

@api_router.get("/users/profile", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    return UserProfile(**current_user)

@api_router.put("/users/profile")
async def update_profile(profile_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update current user's profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    
    if update_data:
        await db.users.update_one(
            {"user_id": current_user["user_id"]},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0, "password": 0})
    return updated_user

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get another user's public profile"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0, "email": 0, "blocked_users": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.post("/users/block/{user_id}")
async def block_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Block a user"""
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$addToSet": {"blocked_users": user_id}}
    )
    return {"message": "User blocked"}

@api_router.post("/users/unblock/{user_id}")
async def unblock_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Unblock a user"""
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$pull": {"blocked_users": user_id}}
    )
    return {"message": "User unblocked"}

@api_router.get("/users/blocked")
async def get_blocked_users(current_user: dict = Depends(get_current_user)):
    """Get list of blocked users"""
    blocked_ids = current_user.get("blocked_users", [])
    if not blocked_ids:
        return []
    
    blocked_users = await db.users.find(
        {"user_id": {"$in": blocked_ids}},
        {"_id": 0, "user_id": 1, "first_name": 1, "photo": 1}
    ).to_list(100)
    return blocked_users

# ======================= EVENT ENDPOINTS =======================

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two coordinates using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

@api_router.post("/events", response_model=EventResponse)
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    """Create a new event (New School)"""
    # Check subscription limits (creation + join count together)
    tier = current_user.get("subscription_tier", "free")
    events_created = current_user.get("events_created_this_month", 0)
    events_joined = current_user.get("events_joined_this_month", 0)
    total_events = events_created + events_joined
    
    tier_info = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])
    monthly_limit = tier_info.get("monthly_limit", 1)
    
    if monthly_limit != -1 and total_events >= monthly_limit:
        raise HTTPException(status_code=403, detail=f"Limite mensuelle atteinte ({monthly_limit}). Passez à un abonnement supérieur pour continuer.")
    
    event_id = f"event_{uuid.uuid4().hex[:12]}"
    
    event_doc = {
        "event_id": event_id,
        "name": event_data.name,
        "description": event_data.description,
        "location_name": event_data.location_name,
        "latitude": event_data.latitude,
        "longitude": event_data.longitude,
        "max_participants": event_data.max_participants,
        "current_participants": 1,
        "duration_hours": event_data.duration_hours,
        "desired_nationalities": event_data.desired_nationalities,
        "theme": event_data.theme,
        "photo": event_data.photo,
        "creator_id": current_user["user_id"],
        "creator_name": current_user["first_name"],
        "creator_photo": current_user.get("photo"),
        "participants": [{
            "user_id": current_user["user_id"],
            "first_name": current_user["first_name"],
            "photo": current_user.get("photo"),
            "joined_at": datetime.now(timezone.utc).isoformat()
        }],
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "start_time": event_data.start_time or datetime.now(timezone.utc),
        "is_full": False
    }
    
    await db.events.insert_one(event_doc)
    
    # Update user's event count
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$inc": {"events_created_this_month": 1}}
    )
    
    event_doc.pop("_id", None)
    return EventResponse(**event_doc)

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: float = 50,
    theme: Optional[str] = None,
    search: Optional[str] = None,
    language: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get events with optional filters"""
    query = {"status": "active"}
    
    # Text search
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location_name": {"$regex": search, "$options": "i"}}
        ]
    
    # Theme filter
    if theme:
        query["theme"] = theme
    
    # Language filter (assuming language is stored in desired_nationalities or we add a languages field)
    if language:
        query["desired_nationalities"] = language
    
    events = await db.events.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Filter by distance if coordinates provided
    if latitude is not None and longitude is not None:
        filtered_events = []
        for event in events:
            distance = calculate_distance(latitude, longitude, event["latitude"], event["longitude"])
            if distance <= radius_km:
                event["distance_km"] = round(distance, 2)
                filtered_events.append(event)
        events = sorted(filtered_events, key=lambda x: x.get("distance_km", 0))
    
    return [EventResponse(**event) for event in events]

@api_router.get("/events/nearby")
async def get_nearby_events(
    latitude: float,
    longitude: float,
    radius_km: float = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get events near a specific location"""
    events = await db.events.find({"status": "active"}, {"_id": 0}).to_list(500)
    
    nearby_events = []
    for event in events:
        distance = calculate_distance(latitude, longitude, event["latitude"], event["longitude"])
        if distance <= radius_km:
            event["distance_km"] = round(distance, 2)
            nearby_events.append(event)
    
    return sorted(nearby_events, key=lambda x: x["distance_km"])

@api_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific event"""
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventResponse(**event)

@api_router.post("/events/{event_id}/join")
async def join_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Join an event"""
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event["is_full"]:
        raise HTTPException(status_code=400, detail="Événement complet")
    
    # Check if already joined
    participant_ids = [p["user_id"] for p in event.get("participants", [])]
    if current_user["user_id"] in participant_ids:
        raise HTTPException(status_code=400, detail="Vous avez déjà rejoint cet événement")
    
    # Check subscription limits (creation + join count together)
    tier = current_user.get("subscription_tier", "free")
    events_created = current_user.get("events_created_this_month", 0)
    events_joined = current_user.get("events_joined_this_month", 0)
    total_events = events_created + events_joined
    
    tier_info = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])
    monthly_limit = tier_info.get("monthly_limit", 1)
    
    if monthly_limit != -1 and total_events >= monthly_limit:
        raise HTTPException(status_code=403, detail=f"Limite mensuelle atteinte ({monthly_limit}). Passez à un abonnement supérieur pour continuer.")
    
    new_participant = {
        "user_id": current_user["user_id"],
        "first_name": current_user["first_name"],
        "photo": current_user.get("photo"),
        "joined_at": datetime.now(timezone.utc).isoformat()
    }
    
    new_count = event["current_participants"] + 1
    is_full = new_count >= event["max_participants"]
    
    await db.events.update_one(
        {"event_id": event_id},
        {
            "$push": {"participants": new_participant},
            "$inc": {"current_participants": 1},
            "$set": {"is_full": is_full}
        }
    )
    
    # Update user's joined count
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$inc": {"events_joined_this_month": 1}}
    )
    
    # Send push notification to event creator
    await notify_event_creator(event_id, current_user["first_name"])
    
    return {"message": "Vous avez rejoint la New School !", "is_full": is_full}

@api_router.post("/events/{event_id}/leave")
async def leave_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Leave an event"""
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event["creator_id"] == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Creator cannot leave the event. Delete it instead.")
    
    await db.events.update_one(
        {"event_id": event_id},
        {
            "$pull": {"participants": {"user_id": current_user["user_id"]}},
            "$inc": {"current_participants": -1},
            "$set": {"is_full": False}
        }
    )
    
    return {"message": "Successfully left the event"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an event (creator only)"""
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event["creator_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can delete this event")
    
    await db.events.delete_one({"event_id": event_id})
    await db.messages.delete_many({"event_id": event_id})
    
    return {"message": "Event deleted successfully"}

@api_router.get("/events/user/created")
async def get_user_created_events(current_user: dict = Depends(get_current_user)):
    """Get events created by the current user"""
    events = await db.events.find(
        {"creator_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return events

@api_router.get("/events/user/joined")
async def get_user_joined_events(current_user: dict = Depends(get_current_user)):
    """Get events the current user has joined"""
    events = await db.events.find(
        {"participants.user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return events

# ======================= MESSAGING ENDPOINTS =======================

# Simple moderation filter
BAD_WORDS = ["spam", "scam", "hate", "violence"]  # Simplified, replace with Perspective API

def moderate_content(content: str) -> bool:
    """Basic content moderation - returns True if content is acceptable"""
    content_lower = content.lower()
    for word in BAD_WORDS:
        if word in content_lower:
            return False
    return True

@api_router.post("/events/{event_id}/messages", response_model=MessageResponse)
async def send_message(event_id: str, message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a message in an event chat"""
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user is a participant
    participant_ids = [p["user_id"] for p in event.get("participants", [])]
    if current_user["user_id"] not in participant_ids:
        raise HTTPException(status_code=403, detail="Vous devez rejoindre l'événement pour envoyer des messages")
    
    # Moderate content
    if message_data.message_type == "text" and not moderate_content(message_data.content):
        raise HTTPException(status_code=400, detail="Message contient du contenu inapproprié")
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    
    message_doc = {
        "message_id": message_id,
        "event_id": event_id,
        "sender_id": current_user["user_id"],
        "sender_name": current_user["first_name"],
        "sender_photo": current_user.get("photo"),
        "content": message_data.content,
        "message_type": message_data.message_type,
        "created_at": datetime.now(timezone.utc),
        "is_read": False
    }
    
    await db.messages.insert_one(message_doc)
    message_doc.pop("_id", None)
    
    # Send push notifications to other participants
    await notify_chat_participants(event_id, current_user["user_id"], current_user["first_name"], message_data.content)
    
    return MessageResponse(**message_doc)

@api_router.get("/events/{event_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    event_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for an event chat"""
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user is a participant
    participant_ids = [p["user_id"] for p in event.get("participants", [])]
    if current_user["user_id"] not in participant_ids:
        raise HTTPException(status_code=403, detail="Must join the event to view messages")
    
    # Get blocked users to filter out their messages
    blocked_users = current_user.get("blocked_users", [])
    
    query = {"event_id": event_id}
    if blocked_users:
        query["sender_id"] = {"$nin": blocked_users}
    
    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", 1).skip(skip).limit(limit).to_list(limit)
    
    return [MessageResponse(**msg) for msg in messages]

@api_router.get("/chats")
async def get_user_chats(current_user: dict = Depends(get_current_user)):
    """Get all chats (events) the user is part of with last message"""
    events = await db.events.find(
        {"participants.user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    chats = []
    for event in events:
        # Get last message
        last_message = await db.messages.find_one(
            {"event_id": event["event_id"]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        # Count unread messages
        unread_count = await db.messages.count_documents({
            "event_id": event["event_id"],
            "sender_id": {"$ne": current_user["user_id"]},
            "is_read": False
        })
        
        chats.append({
            "event_id": event["event_id"],
            "event_name": event["name"],
            "event_photo": event.get("photo"),
            "participants_count": event["current_participants"],
            "last_message": last_message,
            "unread_count": unread_count
        })
    
    # Sort by last message time
    chats.sort(key=lambda x: x["last_message"]["created_at"] if x["last_message"] else datetime.min, reverse=True)
    
    return chats

# ======================= SUBSCRIPTION ENDPOINTS (MOCK) =======================

SUBSCRIPTION_TIERS = {
    "free": {
        "tier": "free",
        "price": 0,
        "monthly_limit": 1,
        "features": ["1 création ou participation par mois", "Chat de groupe basique", "Accès à la carte"]
    },
    "standard": {
        "tier": "standard",
        "price": 4.99,
        "monthly_limit": 5,
        "features": ["5 créations ou participations par mois", "Chat complet avec médias", "Filtres avancés", "Support prioritaire"]
    },
    "ambassador": {
        "tier": "ambassador",
        "price": 10.99,
        "monthly_limit": -1,  # -1 = unlimited
        "features": ["Créations et participations illimitées", "Badge Ambassadeur sur le profil", "Accès anticipé aux nouveautés", "Support VIP", "Événements exclusifs"]
    }
}

@api_router.get("/subscriptions/tiers")
async def get_subscription_tiers():
    """Get all subscription tiers and their features"""
    return list(SUBSCRIPTION_TIERS.values())

@api_router.get("/subscriptions/current")
async def get_current_subscription(current_user: dict = Depends(get_current_user)):
    """Get current user's subscription"""
    tier = current_user.get("subscription_tier", "free")
    return {
        "current_tier": tier,
        "tier_info": SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"]),
        "events_created_this_month": current_user.get("events_created_this_month", 0),
        "events_joined_this_month": current_user.get("events_joined_this_month", 0)
    }

@api_router.post("/subscriptions/upgrade")
async def upgrade_subscription(subscription: SubscriptionUpdate, current_user: dict = Depends(get_current_user)):
    """Upgrade subscription (MOCK - In production, integrate with RevenueCat)"""
    if subscription.tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    # MOCK: In production, this would verify payment through RevenueCat
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"subscription_tier": subscription.tier}}
    )
    
    return {
        "message": f"Successfully upgraded to {subscription.tier}",
        "tier_info": SUBSCRIPTION_TIERS[subscription.tier]
    }

# ======================= REPORT ENDPOINTS =======================

@api_router.post("/reports")
async def create_report(report_data: ReportCreate, current_user: dict = Depends(get_current_user)):
    """Report a user, event, or message"""
    report_id = f"report_{uuid.uuid4().hex[:12]}"
    
    report_doc = {
        "report_id": report_id,
        "reporter_id": current_user["user_id"],
        "reported_id": report_data.reported_id,
        "report_type": report_data.report_type,
        "reason": report_data.reason,
        "description": report_data.description,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.reports.insert_one(report_doc)
    
    # Check if user should be auto-banned (3+ reports)
    if report_data.report_type == "user":
        was_banned = await check_auto_ban(report_data.reported_id)
        if was_banned:
            return {"message": "Signalement enregistré. L'utilisateur a été automatiquement banni.", "report_id": report_id, "auto_banned": True}
    
    return {"message": "Signalement enregistré", "report_id": report_id}

# ======================= MISC ENDPOINTS =======================

@api_router.get("/")
async def root():
    return {"message": "New School API v1.0", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Languages and Nationalities lists
LANGUAGES = ["Français", "English", "Español", "Deutsch", "Italiano", "Português", "中文", "日本語", "한국어", "العربية", "हिन्दी", "Русский"]
NATIONALITIES = ["French", "American", "British", "Spanish", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Brazilian", "Mexican", "Canadian", "Australian", "Indian", "Russian", "Other"]
THEMES = ["Food & Drinks", "Sports", "Music", "Art & Culture", "Outdoor", "Nightlife", "Business", "Language Exchange", "Travel", "Gaming", "Other"]

@api_router.get("/config/languages")
async def get_languages():
    return LANGUAGES

@api_router.get("/config/nationalities")
async def get_nationalities():
    return NATIONALITIES

@api_router.get("/config/themes")
async def get_themes():
    return THEMES

# ======================= ADMIN ENDPOINTS =======================

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get admin dashboard statistics"""
    total_users = await db.users.count_documents({})
    total_events = await db.events.count_documents({})
    active_events = await db.events.count_documents({"status": "active"})
    total_messages = await db.messages.count_documents({})
    
    # Subscription counts
    free_count = await db.users.count_documents({"subscription_tier": {"$in": ["free", None]}})
    standard_count = await db.users.count_documents({"subscription_tier": "standard"})
    ambassador_count = await db.users.count_documents({"subscription_tier": "ambassador"})
    
    # Calculate monthly revenue (mock - based on current subscribers)
    monthly_revenue = (standard_count * 4.99) + (ambassador_count * 10.99)
    
    # Pending reports
    reports_pending = await db.reports.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "total_events": total_events,
        "active_events": active_events,
        "total_messages": total_messages,
        "subscriptions": {
            "free": free_count,
            "standard": standard_count,
            "ambassador": ambassador_count
        },
        "monthly_revenue": monthly_revenue,
        "reports_pending": reports_pending
    }

@api_router.get("/admin/users")
async def get_admin_users(current_user: dict = Depends(get_current_user)):
    """Get all users for admin"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(1000)
    
    # Add report count for each user
    for user in users:
        report_count = await db.reports.count_documents({
            "reported_id": user["user_id"],
            "report_type": "user"
        })
        user["report_count"] = report_count
    
    return users

@api_router.get("/admin/reports")
async def get_admin_reports(current_user: dict = Depends(get_current_user)):
    """Get all pending reports for admin"""
    reports = await db.reports.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add reported user info
    for report in reports:
        if report.get("report_type") == "user":
            reported_user = await db.users.find_one(
                {"user_id": report["reported_id"]},
                {"_id": 0, "user_id": 1, "first_name": 1, "email": 1, "photo": 1}
            )
            report["reported_user"] = reported_user
    
    return reports

@api_router.post("/admin/users/{user_id}/ban")
async def ban_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Ban a user"""
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_banned": True, "banned_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Mark all reports for this user as resolved
    await db.reports.update_many(
        {"reported_id": user_id, "status": "pending"},
        {"$set": {"status": "resolved_ban"}}
    )
    
    return {"message": "Utilisateur banni"}

@api_router.post("/admin/users/{user_id}/unban")
async def unban_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Unban a user"""
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_banned": False}, "$unset": {"banned_at": ""}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": "Utilisateur débanni"}

@api_router.post("/admin/reports/{report_id}/resolve")
async def resolve_report(report_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Resolve a report (dismiss or ban)"""
    body = await request.json()
    action = body.get("action")  # "dismiss" or "ban"
    
    report = await db.reports.find_one({"report_id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Signalement non trouvé")
    
    if action == "ban":
        # Ban the reported user
        await db.users.update_one(
            {"user_id": report["reported_id"]},
            {"$set": {"is_banned": True, "banned_at": datetime.now(timezone.utc)}}
        )
        # Mark report as resolved with ban
        await db.reports.update_one(
            {"report_id": report_id},
            {"$set": {"status": "resolved_ban"}}
        )
    else:
        # Just dismiss the report
        await db.reports.update_one(
            {"report_id": report_id},
            {"$set": {"status": "dismissed"}}
        )
    
    return {"message": "Signalement traité"}

# Auto-ban check function (called when a new report is created)
async def check_auto_ban(user_id: str):
    """Check if user should be auto-banned (3+ reports)"""
    report_count = await db.reports.count_documents({
        "reported_id": user_id,
        "report_type": "user",
        "status": "pending"
    })
    
    if report_count >= 3:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"is_banned": True, "banned_at": datetime.now(timezone.utc), "auto_banned": True}}
        )
        # Mark all reports as resolved
        await db.reports.update_many(
            {"reported_id": user_id, "status": "pending"},
            {"$set": {"status": "auto_banned"}}
        )
        return True
    return False

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db():
    # Create indexes
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.events.create_index("event_id", unique=True)
    await db.events.create_index([("latitude", 1), ("longitude", 1)])
    await db.messages.create_index("event_id")
    await db.messages.create_index([("event_id", 1), ("created_at", 1)])
    await db.user_sessions.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token")
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
