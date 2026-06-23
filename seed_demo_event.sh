#!/bin/bash

# Current UTC time for the event
START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
END_TIME=$(date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%SZ")

echo "Triggering the perfect demo event at Mekhri Circle..."

curl -X POST http://localhost:5000/api/events/plan \
  -H "Content-Type: application/json" \
  -d '{
    "type": "unplanned",
    "category": "accident",
    "name": "Major Multi-Vehicle Collision at Mekhri Circle",
    "description": "Severe collision blocking multiple lanes on Bellary Road. High risk of secondary incidents and rapid congestion spread. Requires immediate containment.",
    "lat": 13.014602,
    "lon": 77.583981,
    "expected_crowd_size": 0,
    "start_datetime": "'"$START_TIME"'",
    "expected_end_datetime": "'"$END_TIME"'",
    "affected_corridors": ["Bellary Road 1"],
    "requires_road_closure": true,
    "veh_type": "HGV",
    "priority": "Critical"
  }'

echo ""
echo "Event created successfully! Check your GridLock dashboard."
