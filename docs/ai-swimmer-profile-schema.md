# AI Swimming Set - Phase 1 User Profile Schema

This schema extends `users/{uid}` in Firebase Realtime Database.

## User Node

```json
{
  "uid": "string",
  "email": "string",
  "role": "student | parent | instructor | admin",
  "displayName": "string",
  "childrenIds": ["string"],
  "createdAt": "ISO-8601",
  "swimmerProfile": {
    "level": "beginner | intermediate | advanced | competitive",
    "waterTreadingCapabilitySeconds": 30,
    "fearOfDeepWater": true,
    "fitnessGoals": ["build-water-confidence"],
    "preferredStrokes": ["freestyle"],
    "sessionTimeLimitMinutes": 40,
    "notes": "optional string",
    "updatedAt": "ISO-8601"
  }
}
```

## Notes

- `swimmerProfile` defaults are auto-populated on profile provisioning.
- Learner Portal fetches `users/{currentUid}` only, based on authenticated user context.
- Parent accounts can still view defaults if swimmer profile data is not yet customized.
