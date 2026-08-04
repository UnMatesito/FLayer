from decimal import Decimal, InvalidOperation

NOZZLE_PRESETS = {"0.2", "0.4", "0.6", "0.8"}


def validate_nozzle_sizes(nozzles: list[str]) -> list[str]:
    """Validate a nozzle size list.

    Each entry must be one of the presets (0.2/0.4/0.6/0.8) or a positive
    decimal (custom size), and duplicates are rejected.
    """
    seen: set[str] = set()
    result: list[str] = []
    for size in nozzles:
        normalized = size.strip()
        if not normalized:
            raise ValueError("Nozzle sizes must not be empty")
        if normalized not in NOZZLE_PRESETS:
            try:
                value = Decimal(normalized)
            except InvalidOperation:
                raise ValueError(f"Invalid nozzle size: {size}")
            if value <= 0:
                raise ValueError(f"Invalid nozzle size: {size}")
        if normalized in seen:
            raise ValueError(f"Duplicate nozzle size: {size}")
        seen.add(normalized)
        result.append(normalized)
    return result
