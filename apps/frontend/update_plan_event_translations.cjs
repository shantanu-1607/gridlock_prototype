const fs = require('fs');

const enPath = '/home/vedant/Documents/Projects/gridlock_prototype/apps/frontend/public/locales/en/translation.json';
const knPath = '/home/vedant/Documents/Projects/gridlock_prototype/apps/frontend/public/locales/kn/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const knData = JSON.parse(fs.readFileSync(knPath, 'utf8'));

const enNew = {
  "planEventForm": {
    "incidentDetails": "Incident Details",
    "eventName": "Event Name",
    "eventNamePlaceholder": "e.g. Pipeline burst near Silk Board",
    "category": "Category",
    "type": "Type",
    "unplanned": "Unplanned",
    "planned": "Planned",
    "priority": "Priority",
    "requiresRoadClosure": "Requires Road Closure",
    "location": "Location",
    "corridor": "Corridor",
    "searchLocation": "Search Location",
    "searchLocationPlaceholder": "e.g. M. Chinnaswamy Stadium",
    "coordinates": "Coordinates",
    "timing": "Timing",
    "startDateTime": "Start Date & Time",
    "description": "Description (optional)",
    "descriptionPlaceholder": "Additional context for the command team...",
    "runPredictivePipeline": "Run Predictive Pipeline",
    "validationName": "Please enter an event name.",
    "validationDate": "Please set a start date and time.",
    "validationLocation": "Please pick a valid location (search or tap the map).",
    "validationCrowd": "Expected crowd size cannot be negative.",
    "priorityLow": "Low",
    "priorityMedium": "Medium",
    "priorityHigh": "High",
    "priorityCritical": "Critical"
  }
};

const knNew = {
  "planEventForm": {
    "incidentDetails": "ಘಟನಾ ವಿವರಗಳು",
    "eventName": "ಘಟನೆಯ ಹೆಸರು",
    "eventNamePlaceholder": "ಉದಾ. ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಬಳಿ ಪೈಪ್‌ಲೈನ್ ಒಡೆದಿದೆ",
    "category": "ವರ್ಗ",
    "type": "ಪ್ರಕಾರ",
    "unplanned": "ಯೋಜಿಸದ",
    "planned": "ಯೋಜಿತ",
    "priority": "ಆದ್ಯತೆ",
    "requiresRoadClosure": "ರಸ್ತೆ ಮುಚ್ಚುವ ಅಗತ್ಯವಿದೆ",
    "location": "ಸ್ಥಳ",
    "corridor": "ಕಾರಿಡಾರ್",
    "searchLocation": "ಸ್ಥಳವನ್ನು ಹುಡುಕಿ",
    "searchLocationPlaceholder": "ಉದಾ. ಎಂ. ಚಿನ್ನಸ್ವಾಮಿ ಕ್ರೀಡಾಂಗಣ",
    "coordinates": "ನಿರ್ದೇಶಾಂಕಗಳು",
    "timing": "ಸಮಯ",
    "startDateTime": "ಪ್ರಾರಂಭ ದಿನಾಂಕ ಮತ್ತು ಸಮಯ",
    "description": "ವಿವರಣೆ (ಐಚ್ಛಿಕ)",
    "descriptionPlaceholder": "ಕಮಾಂಡ್ ತಂಡಕ್ಕೆ ಹೆಚ್ಚುವರಿ ಸಂದರ್ಭ...",
    "runPredictivePipeline": "ಪ್ರಿಡಿಕ್ಟಿವ್ ಪೈಪ್‌ಲೈನ್ ಚಲಾಯಿಸಿ",
    "validationName": "ದಯವಿಟ್ಟು ಘಟನೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.",
    "validationDate": "ದಯವಿಟ್ಟು ಪ್ರಾರಂಭ ದಿನಾಂಕ ಮತ್ತು ಸಮಯವನ್ನು ಹೊಂದಿಸಿ.",
    "validationLocation": "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಸ್ಥಳವನ್ನು ಆರಿಸಿ (ಹುಡುಕಿ ಅಥವಾ ನಕ್ಷೆಯನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ).",
    "validationCrowd": "ನಿರೀಕ್ಷಿತ ಜನಸಂದಣಿ ಗಾತ್ರವು ಋಣಾತ್ಮಕವಾಗಿರಬಾರದು.",
    "priorityLow": "ಕಡಿಮೆ",
    "priorityMedium": "ಮಧ್ಯಮ",
    "priorityHigh": "ಹೆಚ್ಚು",
    "priorityCritical": "ತುರ್ತು"
  }
};

fs.writeFileSync(enPath, JSON.stringify({ ...enData, ...enNew }, null, 2));
fs.writeFileSync(knPath, JSON.stringify({ ...knData, ...knNew }, null, 2));
console.log('Translations updated.');
