const fs = require('fs');

const enPath = '/home/vedant/Documents/Projects/gridlock_prototype/apps/frontend/public/locales/en/translation.json';
const knPath = '/home/vedant/Documents/Projects/gridlock_prototype/apps/frontend/public/locales/kn/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const knData = JSON.parse(fs.readFileSync(knPath, 'utf8'));

const enNew = {
  "settingsPage": {
    "title": "Settings",
    "subtitle": "Account and system preferences",
    "accountTitle": "Account",
    "accountSubtitle": "Signed-in controller identity",
    "signOut": "Sign out",
    "systemStatusTitle": "System Status",
    "systemStatusSubtitle": "Live data connection and alerts",
    "wsSync": "WebSocket Sync",
    "connected": "Connected",
    "offline": "Offline",
    "notifications": "Notifications",
    "enabled": "Enabled",
    "preferencesTitle": "Preferences",
    "preferencesSubtitle": "Localization and display",
    "dashboardLanguage": "Dashboard Language"
  },
  "overviewPage": {
    "title": "Overview",
    "subtitle": "Live snapshot of the most recently planned or selected event",
    "predictedMinutes": "PREDICTED MINUTES",
    "min": "min",
    "severity": "SEVERITY",
    "confidence": "CONFIDENCE",
    "anomaly": "ANOMALY",
    "congestionRisk": "Congestion Risk",
    "queueLength": "QUEUE LENGTH",
    "spillover": "SPILLOVER",
    "similarIncidents": "Similar Incidents",
    "congestionSpread": "Congestion Spread",
    "spatioTemporalContext": "Spatio-Temporal Context",
    "forecastVsBaseline": "Forecast vs similar-incident baseline",
    "vs": "vs",
    "avg": "avg",
    "tandemCorridorSpillback": "Tandem Corridor Spillback",
    "stagedSubSegments": "staged sub-segments",
    "upstreamStage1": "Upstream Stage 1",
    "upstreamStage2": "Upstream Stage 2",
    "upstreamStage3": "Upstream Stage 3",
    "incidentSegment": "Incident Segment"
  },
  "performancePage": {
    "title": "Performance Metrics",
    "subtitle": "Resource deployment and signal gating impact",
    "deploymentByJunction": "Deployment by Junction",
    "fleetCount": "Fleet Count",
    "fleetDeploymentDetail": "Fleet Deployment Detail",
    "officersDispatched": "OFFICERS DISPATCHED",
    "contingencyUnits": "contingency units",
    "preStagedForExtendedDuration": "pre-staged for extended-duration risk",
    "strategicRationale": "Strategic Rationale:",
    "barricadePlan": "Barricade Plan",
    "barricadesRecommended": "BARRICADES RECOMMENDED",
    "barricadeStrategy": "Barricade Strategy:",
    "signalGatingRecommendations": "Signal Gating Recommendations",
    "activePhaseModifications": "ACTIVE PHASE MODIFICATIONS",
    "signalStrategy": "Signal Strategy:"
  }
};

const knNew = {
  "settingsPage": {
    "title": "ಸೆಟ್ಟಿಂಗ್ಸ್",
    "subtitle": "ಖಾತೆ ಮತ್ತು ಸಿಸ್ಟಮ್ ಆದ್ಯತೆಗಳು",
    "accountTitle": "ಖಾತೆ",
    "accountSubtitle": "ಸೈನ್ ಇನ್ ಆದ ನಿಯಂತ್ರಕ ಗುರುತು",
    "signOut": "ಸೈನ್ ಔಟ್",
    "systemStatusTitle": "ಸಿಸ್ಟಮ್ ಸ್ಥಿತಿ",
    "systemStatusSubtitle": "ಲೈವ್ ಡೇಟಾ ಸಂಪರ್ಕ ಮತ್ತು ಎಚ್ಚರಿಕೆಗಳು",
    "wsSync": "ವೆಬ್‌ಸಾಕೆಟ್ ಸಿಂಕ್",
    "connected": "ಸಂಪರ್ಕಗೊಂಡಿದೆ",
    "offline": "ಆಫ್‌ಲೈನ್",
    "notifications": "ಅಧಿಸೂಚನೆಗಳು",
    "enabled": "ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ",
    "preferencesTitle": "ಆದ್ಯತೆಗಳು",
    "preferencesSubtitle": "ಸ್ಥಳೀಕರಣ ಮತ್ತು ಪ್ರದರ್ಶನ",
    "dashboardLanguage": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಭಾಷೆ"
  },
  "overviewPage": {
    "title": "ಅವಲೋಕನ",
    "subtitle": "ಇತ್ತೀಚಿನ ಯೋಜಿತ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿದ ಈವೆಂಟ್‌ನ ಲೈವ್ ಸ್ನ್ಯಾಪ್‌ಶಾಟ್",
    "predictedMinutes": "ಅಂದಾಜು ನಿಮಿಷಗಳು",
    "min": "ನಿಮಿಷ",
    "severity": "ತೀವ್ರತೆ",
    "confidence": "ವಿಶ್ವಾಸ",
    "anomaly": "ಅಸಂಗತತೆ",
    "congestionRisk": "ದಟ್ಟಣೆಯ ಅಪಾಯ",
    "queueLength": "ಸರತಿಯ ಉದ್ದ",
    "spillover": "ಸ್ಪಿಲ್‌ಓವರ್",
    "similarIncidents": "ಇದೇ ರೀತಿಯ ಘಟನೆಗಳು",
    "congestionSpread": "ದಟ್ಟಣೆಯ ಹರಡುವಿಕೆ",
    "spatioTemporalContext": "ಪ್ರಾದೇಶಿಕ-ತಾತ್ಕಾಲಿಕ ಸಂದರ್ಭ",
    "forecastVsBaseline": "ಮುನ್ಸೂಚನೆ ವರ್ಸಸ್ ಇದೇ ರೀತಿಯ ಘಟನೆಗಳ ಬೇಸ್‌ಲೈನ್",
    "vs": "ವರ್ಸಸ್",
    "avg": "ಸರಾಸರಿ",
    "tandemCorridorSpillback": "ಟ್ಯಾಂಡೆಮ್ ಕಾರಿಡಾರ್ ಸ್ಪಿಲ್‌ಓವರ್",
    "stagedSubSegments": "ಹಂತ ಹಂತದ ಉಪ-ವಿಭಾಗಗಳು",
    "upstreamStage1": "ಅಪ್‌ಸ್ಟ್ರೀಮ್ ಹಂತ 1",
    "upstreamStage2": "ಅಪ್‌ಸ್ಟ್ರೀಮ್ ಹಂತ 2",
    "upstreamStage3": "ಅಪ್‌ಸ್ಟ್ರೀಮ್ ಹಂತ 3",
    "incidentSegment": "ಘಟನಾ ವಿಭಾಗ"
  },
  "performancePage": {
    "title": "ಕಾರ್ಯಕ್ಷಮತೆಯ ಮೆಟ್ರಿಕ್ಸ್",
    "subtitle": "ಸಂಪನ್ಮೂಲ ನಿಯೋಜನೆ ಮತ್ತು ಸಿಗ್ನಲ್ ಗೇಟಿಂಗ್ ಪ್ರಭಾವ",
    "deploymentByJunction": "ಜಂಕ್ಷನ್ ಪ್ರಕಾರ ನಿಯೋಜನೆ",
    "fleetCount": "ಫ್ಲೀಟ್ ಎಣಿಕೆ",
    "fleetDeploymentDetail": "ಫ್ಲೀಟ್ ನಿಯೋಜನೆ ವಿವರ",
    "officersDispatched": "ಅಧಿಕಾರಿಗಳನ್ನು ಕಳುಹಿಸಲಾಗಿದೆ",
    "contingencyUnits": "ಆಕಸ್ಮಿಕ ಘಟಕಗಳು",
    "preStagedForExtendedDuration": "ವಿಸ್ತೃತ-ಅವಧಿಯ ಅಪಾಯಕ್ಕಾಗಿ ಪೂರ್ವ-ಹಂತ",
    "strategicRationale": "ಕಾರ್ಯತಂತ್ರದ ತರ್ಕ:",
    "barricadePlan": "ಬ್ಯಾರಿಕೇಡ್ ಯೋಜನೆ",
    "barricadesRecommended": "ಬ್ಯಾರಿಕೇಡ್‌ಗಳನ್ನು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ",
    "barricadeStrategy": "ಬ್ಯಾರಿಕೇಡ್ ತಂತ್ರ:",
    "signalGatingRecommendations": "ಸಿಗ್ನಲ್ ಗೇಟಿಂಗ್ ಶಿಫಾರಸುಗಳು",
    "activePhaseModifications": "ಸಕ್ರಿಯ ಹಂತ ಮಾರ್ಪಾಡುಗಳು",
    "signalStrategy": "ಸಿಗ್ನಲ್ ತಂತ್ರ:"
  }
};

fs.writeFileSync(enPath, JSON.stringify({ ...enData, ...enNew }, null, 2));
fs.writeFileSync(knPath, JSON.stringify({ ...knData, ...knNew }, null, 2));
console.log('Translations updated.');
