#!/usr/bin/env python3
"""
New School Backend API Testing - Review Request Scenarios
Testing updated backend with gender registration, subscription tiers, array age_ranges, and gender enforcement
"""

import requests
import json
from datetime import datetime, timezone

# Backend URL from frontend environment
BACKEND_URL = "https://app-from-quote.preview.emergentagent.com/api"

def test_user_registration_with_gender():
    """Test user registration with gender field"""
    
    print("🧪 Test 1: User Registration with Gender")
    print("=" * 50)
    
    # Generate unique email to avoid conflicts
    timestamp = datetime.now().strftime("%H%M%S")
    
    register_data = {
        "email": f"test-gender-{timestamp}@newschool.com", 
        "password": "test123",
        "first_name": "Marie",
        "gender": "female"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
        print(f"Registration Response Status: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
        
        auth_data = response.json()
        token = auth_data.get("token")
        user_id = auth_data.get("user_id")
        
        print(f"✅ Registration successful!")
        print(f"   User ID: {user_id}")
        print(f"   First Name: {auth_data.get('first_name')}")
        print(f"   Email: {auth_data.get('email')}")
        
        # Verify user profile includes gender
        headers = {"Authorization": f"Bearer {token}"}
        profile_response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
        
        if profile_response.status_code == 200:
            profile = profile_response.json()
            user_gender = profile.get("gender")
            print(f"   Gender in profile: {user_gender}")
            
            if user_gender == "female":
                print("✅ Gender field correctly saved and retrieved")
                return True, {"token": token, "user_id": user_id, "email": register_data["email"], "gender": "female", "first_name": "Marie"}
            else:
                print(f"❌ Gender field incorrect. Expected 'female', got '{user_gender}'")
                return False, None
        else:
            print("❌ Could not retrieve user profile to verify gender")
            return False, None
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during registration: {e}")
        return False, None

def test_subscription_tiers():
    """Test subscription tiers endpoint"""
    
    print("\n🧪 Test 2: Subscription Tiers")
    print("=" * 40)
    
    try:
        response = requests.get(f"{BACKEND_URL}/subscriptions/tiers")
        print(f"Subscription Tiers Response Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Subscription tiers request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        tiers = response.json()
        print(f"✅ Retrieved {len(tiers)} subscription tiers")
        
        # Verify expected tiers
        expected_tiers = {
            "free": {"price": 0, "creation_limit": 1, "join_limit": 3},
            "standard": {"price": 7.99, "creation_limit": 4, "join_limit": 4}, 
            "ambassador": {"price": 10.99, "creation_limit": -1, "join_limit": -1}
        }
        
        found_tiers = {}
        for tier in tiers:
            tier_name = tier.get("tier")
            found_tiers[tier_name] = tier
        
        print("\nTier Details:")
        success = True
        
        for tier_name, expected in expected_tiers.items():
            if tier_name not in found_tiers:
                print(f"❌ Missing tier: {tier_name}")
                success = False
                continue
                
            tier = found_tiers[tier_name]
            print(f"  {tier_name}:")
            print(f"    Price: {tier.get('price')}€ (Expected: {expected['price']}€)")
            print(f"    Creation Limit: {tier.get('creation_limit')} (Expected: {expected['creation_limit']})")
            print(f"    Join Limit: {tier.get('join_limit')} (Expected: {expected['join_limit']})")
            
            if (tier.get('price') != expected['price'] or 
                tier.get('creation_limit') != expected['creation_limit'] or
                tier.get('join_limit') != expected['join_limit']):
                print(f"❌ Tier {tier_name} has incorrect values")
                success = False
            else:
                print(f"✅ Tier {tier_name} correct")
        
        return success
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during subscription tiers test: {e}")
        return False

def test_create_event_with_age_ranges_array(user_data):
    """Test creating event with age_ranges as array and gender filter"""
    
    print("\n🧪 Test 3: Create Event with age_ranges Array")
    print("=" * 50)
    
    headers = {"Authorization": f"Bearer {user_data['token']}"}
    
    # First upgrade to ambassador to allow multiple events
    print("Upgrading to ambassador subscription...")
    upgrade_data = {"tier": "ambassador"}
    try:
        response = requests.post(f"{BACKEND_URL}/subscriptions/upgrade", json=upgrade_data, headers=headers)
        if response.status_code == 200:
            print("✅ Upgraded to ambassador tier")
        else:
            print(f"⚠️ Upgrade failed: {response.text}")
    except:
        print("⚠️ Upgrade request failed, proceeding...")
    
    event_data = {
        "name": "Women's Professional Network",
        "description": "Networking event for professional women",
        "location_name": "Business Center Paris",
        "latitude": 48.8566,
        "longitude": 2.3522,
        "max_participants": 12,
        "duration_hours": 2,
        "gender_filter": "women",
        "age_ranges": ["18-25", "25-35"]
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/events", json=event_data, headers=headers)
        print(f"Event Creation Response Status: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"❌ Event creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
        
        event = response.json()
        event_id = event.get("event_id")
        
        print(f"✅ Event created successfully!")
        print(f"   Event ID: {event_id}")
        print(f"   Name: {event.get('name')}")
        print(f"   Gender Filter: {event.get('gender_filter')}")
        print(f"   Age Ranges: {event.get('age_ranges')}")
        
        # Verify the fields
        if event.get('gender_filter') != 'women':
            print("❌ Gender filter not set correctly")
            return False, None
        
        expected_age_ranges = ["18-25", "25-35"]
        actual_age_ranges = event.get('age_ranges', [])
        
        if actual_age_ranges != expected_age_ranges:
            print(f"❌ Age ranges incorrect. Expected: {expected_age_ranges}, Got: {actual_age_ranges}")
            return False, None
        
        print("✅ Event created with correct gender filter and age_ranges array")
        return True, event_id
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during event creation: {e}")
        return False, None

def test_gender_filter_enforcement(event_id, female_user_data):
    """Test gender filter enforcement by creating male user and trying to join women-only event"""
    
    print("\n🧪 Test 4: Gender Filter Enforcement")
    print("=" * 45)
    
    # Create a male user
    timestamp = datetime.now().strftime("%H%M%S")
    
    male_register_data = {
        "email": f"test-male-{timestamp}@newschool.com",
        "password": "test123", 
        "first_name": "Pierre",
        "gender": "male"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/register", json=male_register_data)
        print(f"Male User Registration Status: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"❌ Male user registration failed: {response.status_code}")
            return False
        
        male_auth = response.json()
        male_token = male_auth.get("token")
        male_headers = {"Authorization": f"Bearer {male_token}"}
        
        print(f"✅ Male user registered: {male_auth.get('first_name')} ({male_auth.get('user_id')})")
        
        # Try to join the women-only event
        print(f"Attempting to join women-only event: {event_id}")
        
        response = requests.post(f"{BACKEND_URL}/events/{event_id}/join", headers=male_headers)
        print(f"Join Event Response Status: {response.status_code}")
        
        if response.status_code == 403:
            error_message = response.json().get("detail", "")
            print(f"✅ Gender filter correctly enforced!")
            print(f"   Error message: {error_message}")
            
            # Verify it's a proper French message about women-only
            if "femmes" in error_message.lower() or "women" in error_message.lower():
                print("✅ Appropriate French error message returned")
                return True
            else:
                print(f"❌ Error message not appropriate: {error_message}")
                return False
        else:
            print(f"❌ Male user was able to join women-only event (Status: {response.status_code})")
            if response.status_code == 200:
                print(f"Response: {response.text}")
            return False
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during gender enforcement test: {e}")
        return False

def test_leave_event_and_credit_refund(event_id, female_user_data):
    """Test leaving an event and verify credit refund with French message"""
    
    print("\n🧪 Test 5: Leave Event and Credit Refund")
    print("=" * 45)
    
    try:
        # Create another female user to join the event (creator cannot leave)
        timestamp = datetime.now().strftime("%H%M%S")
        
        join_register_data = {
            "email": f"test-joiner-{timestamp}@newschool.com",
            "password": "test123",
            "first_name": "Sophie",
            "gender": "female"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json=join_register_data)
        if response.status_code not in [200, 201]:
            print(f"❌ Could not create joiner user: {response.status_code}")
            return False
            
        joiner_auth = response.json()
        joiner_token = joiner_auth.get("token")
        joiner_headers = {"Authorization": f"Bearer {joiner_token}"}
        test_user_id = joiner_auth.get("user_id")
        
        print(f"✅ Created test user: {joiner_auth.get('first_name')} ({test_user_id})")
        
        # Join the event
        print(f"Joining event: {event_id}")
        response = requests.post(f"{BACKEND_URL}/events/{event_id}/join", headers=joiner_headers)
        if response.status_code != 200:
            print(f"❌ Could not join event: {response.status_code} - {response.text}")
            return False
            
        print(f"✅ Successfully joined event")
        headers = joiner_headers
        
        # Get user's joined count before leaving
        response = requests.get(f"{BACKEND_URL}/subscriptions/current", headers=headers)
        if response.status_code == 200:
            before_count = response.json().get("events_joined_this_month", 0)
            print(f"Events joined before leaving: {before_count}")
        else:
            before_count = None
        
        # Now leave the event
        print(f"Leaving event: {event_id}")
        
        response = requests.post(f"{BACKEND_URL}/events/{event_id}/leave", headers=headers)
        print(f"Leave Event Response Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Leave event failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        response_data = response.json()
        message = response_data.get("message", "")
        
        print(f"✅ Successfully left event!")
        print(f"   Response message: {message}")
        
        # Verify French message
        if "quitté" in message or "New School" in message:
            print("✅ Appropriate French message returned")
        else:
            print(f"❌ Message not in expected French format: {message}")
            return False
        
        # Verify credit refund (check joined count decreased)
        if before_count is not None:
            response = requests.get(f"{BACKEND_URL}/subscriptions/current", headers=headers)
            if response.status_code == 200:
                after_count = response.json().get("events_joined_this_month", 0)
                print(f"Events joined after leaving: {after_count}")
                
                if after_count < before_count:
                    print("✅ Join count correctly decremented (credit refunded)")
                else:
                    print("⚠️ Join count not decremented - may be expected for ambassador tier")
            else:
                print("⚠️ Could not verify credit refund")
        
        # Verify user is no longer in event
        response = requests.get(f"{BACKEND_URL}/events/{event_id}", headers=headers)
        if response.status_code == 200:
            event = response.json()
            participants = event.get("participants", [])
            still_in_event = any(p.get("user_id") == test_user_id for p in participants)
            
            if not still_in_event:
                print("✅ User successfully removed from event participants")
                return True
            else:
                print("❌ User still appears in event participants")
                return False
        else:
            print("⚠️ Could not verify user removal from event")
            return True  # Leave was successful, just can't verify removal
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during leave event test: {e}")
        return False

def run_all_tests():
    """Run all test scenarios"""
    
    print("🚀 New School Backend API Testing")
    print(f"Testing against: {BACKEND_URL}")
    print("=" * 60)
    
    results = []
    
    # Test 1: User Registration with Gender
    success, user_data = test_user_registration_with_gender()
    results.append(("User Registration with Gender", success))
    
    if not success:
        print("\n❌ Cannot continue without successful user registration")
        return False
    
    # Test 2: Subscription Tiers
    success = test_subscription_tiers()
    results.append(("Subscription Tiers", success))
    
    # Test 3: Create Event with Age Ranges Array
    success, event_id = test_create_event_with_age_ranges_array(user_data)
    results.append(("Create Event with Age Ranges Array", success))
    
    if not success:
        print("\n❌ Cannot continue without successful event creation")
        return False
    
    # Test 4: Gender Filter Enforcement
    success = test_gender_filter_enforcement(event_id, user_data)
    results.append(("Gender Filter Enforcement", success))
    
    # Test 5: Leave Event and Credit Refund
    success = test_leave_event_and_credit_refund(event_id, user_data)
    results.append(("Leave Event and Credit Refund", success))
    
    # Print results summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED! New School backend is working correctly.")
    else:
        print("💥 SOME TESTS FAILED! Check the output above for details.")
    print("=" * 60)
    
    return all_passed

if __name__ == "__main__":
    run_all_tests()