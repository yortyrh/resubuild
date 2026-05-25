## REMOVED Requirements

### Requirement: Basics view mode SHALL place Edit in the header top-right

**Reason**: Basics Edit placement should match all other CV sections (bottom action bar) for consistent interaction patterns.

**Migration**: No user data migration. Remove `actionsPlacement="header"` from `ManagedBasicsSection`; Basics view rows use default bottom Edit placement via `ResumeItemRow`.
