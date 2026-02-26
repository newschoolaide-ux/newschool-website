#!/usr/bin/env python3
"""
Backend API testing for event creation with gender and age filters
"""

import requests
import json
from datetime import datetime, timezone

# Backend URL from environment
BACKEND_URL = "https://app-from-quote.preview.emergentagent.com/api"

def test_event_creation_with_filters():
    """Test event creation API with new gender_filter and age_range fields"""
    
    print("🧪 Testing Event Creation with Gender and Age Filters")
    print("=" * 60)
    
    # Test 1: Register/Login to get a token
    print("Step 1: Registering test user...")
    
    register_data = {
        "email": "test-filter@example.com",
        "password": "test123",
        "first_name": "Test"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
        print(f"Register Response Status: {response.status_code}")
        
        if response.status_code == 400 and "already registered" in response.text:
            # User exists, try to login
            print("User exists, trying to login...")
            login_data = {
                "email": "test-filter@example.com",
                "password": "test123"
            }
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            print(f"Login Response Status: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        auth_data = response.json()
        token = auth_data.get("token")
        
        if not token:
            print("❌ No token received from authentication")
            return False
        
        print(f"✅ Authentication successful. User ID: {auth_data.get('user_id')}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during authentication: {e}")
        return False
    
    # Headers for authenticated requests
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Upgrade subscription to allow multiple events
    print("\nUpgrading subscription to allow multiple events...")
    
    try:
        upgrade_data = {"tier": "ambassador"}
        response = requests.post(f"{BACKEND_URL}/subscriptions/upgrade", json=upgrade_data, headers=headers)
        print(f"Subscription Upgrade Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Subscription upgraded to ambassador (unlimited events)")
        else:
            print(f"⚠️ Subscription upgrade failed, proceeding with free tier: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Network error during subscription upgrade: {e}")
    
    # Test 2: Create event with gender_filter="women" and age range 25-35
    print("\nStep 2: Creating event with women filter and age range 25-35...")
    
    event_data_1 = {
        "name": "Women's Networking Event",
        "description": "Professional networking event for women entrepreneurs",
        "location_name": "Cafe Central Paris",
        "latitude": 48.8566,
        "longitude": 2.3522,
        "max_participants": 15,
        "duration_hours": 3,
        "gender_filter": "women",
        "age_range_min": 25,
        "age_range_max": 35
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/events", json=event_data_1, headers=headers)
        print(f"Event Creation Response Status: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"❌ Event creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        event_1 = response.json()
        event_1_id = event_1.get("event_id")
        
        print(f"✅ Event 1 created successfully. Event ID: {event_1_id}")
        
        # Verify the new fields are present and correct
        print(f"Gender Filter: {event_1.get('gender_filter')}")
        print(f"Age Range Min: {event_1.get('age_range_min')}")
        print(f"Age Range Max: {event_1.get('age_range_max')}")
        
        if event_1.get('gender_filter') != 'women':
            print("❌ Gender filter not set correctly")
            return False
        if event_1.get('age_range_min') != 25:
            print("❌ Age range min not set correctly")
            return False
        if event_1.get('age_range_max') != 35:
            print("❌ Age range max not set correctly")
            return False
        
        print("✅ All filter fields set correctly in event 1")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during event creation: {e}")
        return False
    
    # Test 3: Verify event can be retrieved with correct filters
    print("\nStep 3: Retrieving events to verify filters...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/events", headers=headers)
        print(f"Events Retrieval Response Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Events retrieval failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        events = response.json()
        
        # Find our event
        found_event_1 = None
        for event in events:
            if event.get("event_id") == event_1_id:
                found_event_1 = event
                break
        
        if not found_event_1:
            print("❌ Created event not found in events list")
            return False
        
        print(f"✅ Event 1 found in events list")
        print(f"Retrieved Gender Filter: {found_event_1.get('gender_filter')}")
        print(f"Retrieved Age Range Min: {found_event_1.get('age_range_min')}")
        print(f"Retrieved Age Range Max: {found_event_1.get('age_range_max')}")
        
        # Verify filters are preserved
        if (found_event_1.get('gender_filter') != 'women' or 
            found_event_1.get('age_range_min') != 25 or 
            found_event_1.get('age_range_max') != 35):
            print("❌ Filter fields not preserved correctly during retrieval")
            return False
        
        print("✅ All filter fields preserved correctly in retrieved event 1")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during events retrieval: {e}")
        return False
    
    # Test 4: Create another event with gender_filter="all" and no age limits
    print("\nStep 4: Creating event with 'all' gender filter and no age limits...")
    
    event_data_2 = {
        "name": "Open Community Meetup",
        "description": "Everyone welcome! Let's build connections across all communities",
        "location_name": "Parc des Buttes-Chaumont",
        "latitude": 48.8799,
        "longitude": 2.3825,
        "max_participants": 20,
        "duration_hours": 2,
        "gender_filter": "all",
        "age_range_min": None,
        "age_range_max": None
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/events", json=event_data_2, headers=headers)
        print(f"Event Creation 2 Response Status: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"❌ Event 2 creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        event_2 = response.json()
        event_2_id = event_2.get("event_id")
        
        print(f"✅ Event 2 created successfully. Event ID: {event_2_id}")
        
        # Verify the new fields are present and correct
        print(f"Gender Filter: {event_2.get('gender_filter')}")
        print(f"Age Range Min: {event_2.get('age_range_min')}")
        print(f"Age Range Max: {event_2.get('age_range_max')}")
        
        if event_2.get('gender_filter') != 'all':
            print("❌ Gender filter not set correctly for event 2")
            return False
        if event_2.get('age_range_min') is not None:
            print("❌ Age range min should be None for event 2")
            return False
        if event_2.get('age_range_max') is not None:
            print("❌ Age range max should be None for event 2")
            return False
        
        print("✅ All filter fields set correctly in event 2")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during event 2 creation: {e}")
        return False
    
    # Test 5: Final verification - retrieve all events and check both
    print("\nStep 5: Final verification - retrieving all events...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/events", headers=headers)
        print(f"Final Events Retrieval Response Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Final events retrieval failed: {response.status_code}")
            return False
        
        events = response.json()
        
        # Check both events
        found_events = {}
        for event in events:
            if event.get("event_id") == event_1_id:
                found_events['event1'] = event
            elif event.get("event_id") == event_2_id:
                found_events['event2'] = event
        
        if len(found_events) != 2:
            print(f"❌ Not all events found. Found: {list(found_events.keys())}")
            return False
        
        # Final verification of event 1
        event1 = found_events['event1']
        if (event1.get('gender_filter') != 'women' or 
            event1.get('age_range_min') != 25 or 
            event1.get('age_range_max') != 35):
            print("❌ Event 1 final verification failed")
            return False
        
        # Final verification of event 2
        event2 = found_events['event2']
        if (event2.get('gender_filter') != 'all' or 
            event2.get('age_range_min') is not None or 
            event2.get('age_range_max') is not None):
            print("❌ Event 2 final verification failed")
            return False
        
        print("✅ Final verification passed - both events have correct filter fields")
        
        # Print summary
        print("\n📊 Test Summary:")
        print(f"Event 1 ({event_1_id}):")
        print(f"  - Name: {event1.get('name')}")
        print(f"  - Gender Filter: {event1.get('gender_filter')}")
        print(f"  - Age Range: {event1.get('age_range_min')}-{event1.get('age_range_max')}")
        
        print(f"\nEvent 2 ({event_2_id}):")
        print(f"  - Name: {event2.get('name')}")
        print(f"  - Gender Filter: {event2.get('gender_filter')}")
        print(f"  - Age Range: {event2.get('age_range_min')}-{event2.get('age_range_max')}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during final verification: {e}")
        return False

def test_specific_event_retrieval():
    """Test retrieving specific events to verify filter fields are included"""
    
    print("\n🔍 Testing Specific Event Retrieval")
    print("=" * 40)
    
    # First need to authenticate
    login_data = {
        "email": "test-filter@example.com", 
        "password": "test123"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
        if response.status_code != 200:
            print("❌ Authentication failed for specific event test")
            return False
        
        token = response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get events to find one to test with
        response = requests.get(f"{BACKEND_URL}/events", headers=headers)
        if response.status_code != 200:
            print("❌ Could not retrieve events for specific test")
            return False
        
        events = response.json()
        if not events:
            print("⚠️ No events found to test specific retrieval")
            return True
        
        # Test specific event retrieval
        test_event = events[0]
        event_id = test_event.get("event_id")
        
        response = requests.get(f"{BACKEND_URL}/events/{event_id}", headers=headers)
        print(f"Specific Event Retrieval Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Specific event retrieval failed: {response.text}")
            return False
        
        specific_event = response.json()
        
        # Check if filter fields are present in response
        has_gender_filter = "gender_filter" in specific_event
        has_age_range_min = "age_range_min" in specific_event  
        has_age_range_max = "age_range_max" in specific_event
        
        print(f"✅ Specific event retrieved: {event_id}")
        print(f"Has gender_filter field: {has_gender_filter} (Value: {specific_event.get('gender_filter')})")
        print(f"Has age_range_min field: {has_age_range_min} (Value: {specific_event.get('age_range_min')})")
        print(f"Has age_range_max field: {has_age_range_max} (Value: {specific_event.get('age_range_max')})")
        
        if not all([has_gender_filter, has_age_range_min, has_age_range_max]):
            print("❌ Some filter fields missing from specific event response")
            return False
        
        print("✅ All filter fields present in specific event response")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error in specific event test: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Backend API Tests for Event Creation with Filters")
    print(f"Testing against: {BACKEND_URL}")
    print("")
    
    success = True
    
    # Run main test
    if not test_event_creation_with_filters():
        success = False
    
    # Run specific event retrieval test 
    if not test_specific_event_retrieval():
        success = False
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ALL TESTS PASSED! Event creation with gender and age filters is working correctly.")
    else:
        print("💥 SOME TESTS FAILED! Check the output above for details.")
    print("=" * 60)