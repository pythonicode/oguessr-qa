import requests
from typing import Any


def fetch_class_storage(class_id: int) -> dict[str, Any]:
    """
    Fetches class storage data from Livelox for a given classId.
    
    Args:
        class_id: The class ID to fetch data for (e.g., 866782)
        
    Returns:
        The JSON data from the class-storage blob
        
    Raises:
        requests.HTTPError: If either API request fails
        KeyError: If the classBlobUrl is not found in the response
    """
    
    # Step 1: Get the class info to retrieve the blob URL
    class_info_url = "https://www.livelox.com/Data/ClassInfo"
    
    class_info_headers = {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "x-requested-with": "XMLHttpRequest",
    }
    
    class_info_payload = {
        "eventId": None,
        "classIds": [class_id],
        "courseIds": [],
        "relayLegs": [],
        "relayLegGroupIds": [],
    }
    
    response = requests.post(
        class_info_url,
        headers=class_info_headers,
        json=class_info_payload,
    )
    response.raise_for_status()
    
    class_info = response.json()
    
    # Extract the blob URL from the response
    blob_url = class_info.get("general", {}).get("classBlobUrl")
    
    if not blob_url:
        raise KeyError(f"classBlobUrl not found in response for classId {class_id}")
    
    # Step 2: Fetch the data from the blob storage
    blob_headers = {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
    }
    
    blob_response = requests.get(
        blob_url,
        headers=blob_headers,
    )
    blob_response.raise_for_status()
    
    return blob_response.json()


if __name__ == "__main__":
    # Example usage
    import json
    
    class_id = 866782  # M21E from Japan Orienteering Championships
    
    try:
        data = fetch_class_storage(class_id)
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error fetching class storage: {e}")

