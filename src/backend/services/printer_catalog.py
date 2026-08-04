PRINTER_CATALOG: list[dict[str, object]] = [
    {
        "brand": "Bambu Lab",
        "models": ["A1", "A1 Mini", "P1S", "P1P", "X1 Carbon", "X1E", "H2D", "H2C", "H2S", "A2L", "P2S", "X2D"],
    },
    {
        "brand": "Creality",
        "models": ["Ender 3", "Ender 3 Pro", "Ender 3 Max", "Ender 3 V2", "Ender 3 S1", "Ender 3 V3 SE", "Ender 3 V3 KE", "K1", "K1C", "K1 Max", "K2 Plus", "CR-10", "SPARKX i7", "K2", "K2 Plus", "K2 Pro", "K2 SE", "K1 SE", "Ender 3 V4", "HI", "Ender 5", "Ender 5 Pro", "Ender 5 Plus", "Ender 5 Max", "Ender 3 V3 Plus", "Ender 3 V3", "Ender 3 S1 Plus", "Ender 3 S1 Pro", "Ender 3 Neo", "Ender 3 V2 Neo", "Ender 3 Max Neo"],
    },
    {
        "brand": "Prusa",
        "models": ["MK3S+", "MK4", "MK4S", "Mini+", "XL", "Core One", "Core One+", "Core One L", "HT90"],
    },
    {
        "brand": "Anycubic",
        "models": ["Kobra 2", "Kobra 2 Pro", "Kobra 2 Neo", "Kobra 2 Max", "Kobra 3", "Kobra 3 V2", "Kobra 3 Max", "Kobra Neo", "Kobra Go", "Kobra X", "Chiron", "Kobra S1", "Kobra S1 Max", "Kobra 4"],
    },
    {
        "brand": "Elegoo",
        "models": ["Neptune 3", "Neptune 3 Pro", "Neptune 3 Plus", "Neptune 3 Max", "Neptune 4", "Neptune 4 Pro", "Neptune 4 Plus", "Neptune 4 Max", "Centauri Carbon", "Centauri Carbon 2", "Orange Storm Giga"],
    },
    {
        "brand": "Artillery",
        "models": ["Sidewinder X1", "Sidewinder X2", "Sidewinder X3 Plus", "Genius", "Hornet", "M1 Pro", "M1 Pro S1", "Sidewinder X4 Pro", "Sidewinder X4 Pro S1", "Sidewinder X4 Plus"],
    },
    {
        "brand": "Flashforge",
        "models": ["Adventurer 3", "Adventurer 4", "Adventurer 5M", "Creator Pro", "Guider 3", "Creator 5", "Adeventurer 5X", "Adventurer 5M Pro"],
    },
    {
        "brand": "Sovol",
        "models": ["SV01", "SV01 Pro", "SV06", "SV06 Plus", "SV06 ACE", "SV07", "SV08", "SV08 Max", "Zero", "Comgrow T300", "Comgrow T500", "SV02", "SV03", "SV04", "SV05", "SV07 Plus"],
    },
    {
        "brand": "Qidi Tech",
        "models": ["Q1 Pro", "X-Plus", "X-Max", "X-CF Pro"],
    },
    {
        "brand": "FLSUN",
        "models": ["Q5", "V400", "Super Racer", "T1", "T1 Pro", "T1 Max", "V400 Max", "S1 Pro"],
    },
]


def get_printer_catalog() -> dict[str, list[dict[str, object]]]:
    """Return the curated brand/model catalog for the printer selects."""
    return {"brands": PRINTER_CATALOG}
