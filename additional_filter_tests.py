#!/usr/bin/env python3
"""
Additional tests for edge cases in gender and age filter functionality
"""

import requests
import json

BACKEND_URL = "https://app-from-quote.preview.emergentagent.com/api"

def test_edge_cases():
    """Test edge cases for gender and age filters"""
    
    print("🧪 Testing Edge Cases for Gender and Age Filters")
    print("=" * 55)
    
    # Login first
    login_data = {"email": "test-filter@example.com", "password": "test123"}
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
        if response.status_code != 200:
            print("❌ Authentication failed")
            return False
        
        token = response.json().get("token")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        print("✅ Authentication successful")
        
    except Exception as e:
        print(f"❌ Auth error: {e}")
        return False
    
    # Test Case 1: gender_filter="men" with age range
    print("\nTest 1: Men filter with age range 18-30...")
    
    event_data = {
        "name": "Men's Football Match",
        "description": "Casual football game for men",
        "location_name": "Parc Montsouris",
        "latitude": 48.8225,
        "longitude": 2.3369,
        "gender_filter": "men",
        "age_range_min": 18,
        "age_range_max": 30
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/events", json=event_data, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            event = response.json()
            print(f"✅ Men filter event created: {event.get('event_id')}")
            print(f"Gender Filter: {event.get('gender_filter')}")
            print(f"Age Range: {event.get('age_range_min')}-{event.get('age_range_max')}")
            
            if event.get('gender_filter') != 'men':
                print("❌ Men filter not set correctly")
                return False
        else:
            print(f"❌ Men filter event creation failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error creating men filter event: {e}")
        return False
    
    # Test Case 2: Only minimum age (no max)
    print("\nTest 2: Women filter with only minimum age...")
    
    event_data = {
        "name": "Women's Professional Network",
        "description": "Career networking for experienced professionals",
        "location_name": "Business District",
        "latitude": 48.8738,
        "longitude": 2.2950,
        "gender_filter": "women", 
        "age_range_min": 30,
        "age_range_max": None
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/events", json=event_data, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            event = response.json()
            print(f"✅ Min age only event created: {event.get('event_id')}")
            print(f"Gender Filter: {event.get('gender_filter')}")
            print(f"Age Range Min: {event.get('age_range_min')}")
            print(f"Age Range Max: {event.get('age_range_max')}")
            
            if (event.get('gender_filter') != 'women' or 
                event.get('age_range_min') != 30 or
                event.get('age_range_max') is not None):
                print("❌ Min age only filter not set correctly")
                return False
        else:
            print(f"❌ Min age only event creation failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error creating min age only event: {e}")
        return False
    
    # Test Case 3: Only maximum age (no min)
    print("\nTest 3: All genders with only maximum age...")
    
    event_data = {
        "name": "Youth Coding Workshop", 
        "description": "Programming workshop for young developers",
        "location_name": "Tech Hub Paris",
        "latitude": 48.8588,
        "longitude": 2.3047,
        "gender_filter": "all",
        "age_range_min": None,
        "age_range_max": 25
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/events", json=event_data, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            event = response.json()
            print(f"✅ Max age only event created: {event.get('event_id')}")
            print(f"Gender Filter: {event.get('gender_filter')}")
            print(f"Age Range Min: {event.get('age_range_min')}")
            print(f"Age Range Max: {event.get('age_range_max')}")
            
            if (event.get('gender_filter') != 'all' or 
                event.get('age_range_min') is not None or
                event.get('age_range_max') != 25):
                print("❌ Max age only filter not set correctly")
                return False
        else:
            print(f"❌ Max age only event creation failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error creating max age only event: {e}")
        return False
    
    # Test Case 4: Verify all events are retrievable with filters
    print("\nTest 4: Retrieving all events to verify all filters...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/events", headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            events = response.json()
            filter_events = [e for e in events if e.get('name') in [
                "Men's Football Match",
                "Women's Professional Network", 
                "Youth Coding Workshop"
            ]]
            
            print(f"✅ Found {len(filter_events)} test events with filters")
            
            for event in filter_events:
                print(f"  - {event.get('name')}: gender={event.get('gender_filter')}, age={event.get('age_range_min')}-{event.get('age_range_max')}")
            
            if len(filter_events) >= 3:
                print("✅ All edge case events retrieved successfully")
            else:
                print("❌ Not all edge case events found")
                return False
        else:
            print(f"❌ Failed to retrieve events: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error retrieving events: {e}")
        return False
    
    print("\n✅ All edge case tests passed!")
    return True

if __name__ == "__main__":
    print("🚀 Running Additional Filter Tests")
    print(f"Testing against: {BACKEND_URL}")
    print("")
    
    success = test_edge_cases()
    
    print("\n" + "=" * 55)
    if success:
        print("🎉 ALL EDGE CASE TESTS PASSED!")
    else:
        print("💥 SOME EDGE CASE TESTS FAILED!")
    print("=" * 55)