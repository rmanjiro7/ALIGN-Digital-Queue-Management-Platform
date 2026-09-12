# ALIGN BACKEND — VALIDATION RULES

**Version:** 1.0
**Last Updated:** 2026-09-05
**Status:** PLANNED — Not yet implemented

---

## Strategy

All untrusted input is validated at the controller boundary using Jakarta Bean Validation (`@Valid`).
Business-rule validation (capacity, state, ownership) is performed in the service layer.
Frontend validation is never relied upon.

---

## DTO Validation Rules

### LoginRequest
| Field | Rule |
|-------|------|
| `email` | `@NotBlank`, `@Email` |
| `password` | `@NotBlank`, `@Size(min=1, max=100)` |

### TokenJoinRequest
| Field | Rule |
|-------|------|
| `serviceId` | `@NotNull`, valid UUID |
| `customerName` | `@Size(max=255)`, nullable |
| `customerPhone` | Custom `@PhoneNumber` validator (E.164 format), nullable |
| `idempotencyKey` | `@Size(max=100)`, nullable |

### CreateLocationRequest
| Field | Rule |
|-------|------|
| `orgId` | `@NotNull`, valid UUID |
| `name` | `@NotBlank`, `@Size(max=255)` |
| `address` | `@Size(max=1000)`, nullable |
| `city` | `@Size(max=100)`, nullable |
| `operatingHours` | `@Size(max=100)`, nullable |
| `isHQ` | `@NotNull` |

### CreateServiceRequest
| Field | Rule |
|-------|------|
| `locationId` | `@NotNull`, valid UUID |
| `name` | `@NotBlank`, `@Size(max=255)` |
| `description` | `@Size(max=2000)`, nullable |
| `isFastTrack` | `@NotNull` |

### UpdateCounterAvailabilityRequest
| Field | Rule |
|-------|------|
| `availability` | `@NotNull`, must be one of `ONLINE|ON_BREAK|AWAY|OFFLINE` |

### CallNextRequest
| Field | Rule |
|-------|------|
| `counterId` | `@NotNull`, valid UUID |

### CreateStaffRequest
| Field | Rule |
|-------|------|
| `orgId` | `@NotNull`, valid UUID |
| `locationId` | `@NotNull`, valid UUID |
| `name` | `@NotBlank`, `@Size(max=255)` |
| `email` | `@NotBlank`, `@Email`, `@Size(max=255)` |
| `role` | `@NotNull`, must be `STAFF` or `ORG_ADMIN` |
| `password` | `@NotBlank`, `@Size(min=8, max=100)` |

---

## Custom Validators

### @PhoneNumber
Validates E.164 international phone format: `+[country code][number]`, e.g. `+15551234567`
- Regex: `^\+[1-9]\d{1,14}$`
- Nullable: allowed (annotation only enforces if non-null)

### @ValidUUID
Path parameter UUID validation (optional, for clear error messages)

---

## Service-Layer Business Validation

These are NOT Jakarta Bean Validation — they are programmatic checks in service methods:

| Check | Exception |
|-------|-----------|
| Queue status == ACTIVE before join | `QueuePausedException` |
| `activeTokenCount < maxCapacity` | `QueueFullException` |
| Token state transition is valid | `InvalidTokenStateException` |
| Counter availability == ONLINE | `CounterNotAvailableException` |
| Counter not already serving | `CounterAlreadyServingException` |
| `resource.orgId == user.orgId` | `UnauthorizedTenantAccessException` |
| Step away from WAITING state only | `InvalidTokenStateException` |

---

## Validation Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "customerPhone",
      "message": "Phone number must be in E.164 format",
      "rejectedValue": "555-1234"
    },
    {
      "field": "serviceId",
      "message": "must not be null",
      "rejectedValue": null
    }
  ]
}
```

---

**Last Updated:** 2026-09-05
**Next Review:** After Phase 1 (DTOs and validation) implementation
