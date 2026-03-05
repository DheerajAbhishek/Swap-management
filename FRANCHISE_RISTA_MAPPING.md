# Franchise to Rista Branch ID Mapping

## Current Franchises in DynamoDB

| DynamoDB ID | Franchise Name | Location | Rista Branch ID |
|-------------|----------------|----------|-----------------|
| franchise-1771491147552 | Swap Wework Roshni | Maratahalli, Bengaluru | `WWR` |
| franchise-1771487755358 | Swap Wework KE | Krish emerald, Kondapur, Hyderabad | `WWK` |
| franchise-1771491253345 | Swap 91sb Blr | Jp nagar, Bengaluru | `91SPBB` |
| franchise-1771489162545 | Swap Captiland | JHitech city, Hyderabad | `SMF` |
| franchise-1771491459927 | Swap wework Vs | Bellandur, Bengaluru | `WWVS` |
| franchise-1771491380622 | Swap wework Symbiosis | Bannerghatta road, Bengaluru | `WWSS` |
| franchise-1771564210285 | test | location | `TO_BE_FILLED` |
| franchise-1771488644010 | Swap wework Rps | Nanakaramguda, Hyderabad | `RPS` |
| franchise-1771489078870 | Swap 91sb Hyd | Kondapur, Hyderabad | `91SPBH` |

---

## Instructions

Please provide the **Rista Branch ID** for each franchise above. The Rista Branch ID is the `branchId` parameter used in the Rista API (e.g., "MK" for Main Kitchen).

### Example Format:
```
Swap Wework Roshni -> MK
Swap Wework KE -> KE
Swap 91sb Blr -> BLR91
...
```

Once you provide the mappings, we can:
1. Store them in a mapping table or configuration
2. Auto-sync sales for each franchise
3. Update the sync button to work for all franchises
