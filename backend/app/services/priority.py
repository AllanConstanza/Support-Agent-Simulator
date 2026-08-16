"""ServiceNow-style Impact x Urgency -> Priority matrix.

Impact and Urgency are both scored 1 (High) - 2 (Medium) - 3 (Low), matching
ServiceNow's convention where a LOWER number means a MORE severe rating.

Priority is derived 1 (Critical) - 4 (Low) using the standard out-of-box
ServiceNow priority matrix:

              Urgency: High(1)   Medium(2)   Low(3)
Impact High(1)          1-Crit    2-High      3-Moderate
Impact Medium(2)        2-High    3-Moderate  4-Low
Impact Low(3)           3-Moderate 4-Low      4-Low
"""

PRIORITY_MATRIX: dict[tuple[int, int], int] = {
    (1, 1): 1,
    (1, 2): 2,
    (1, 3): 3,
    (2, 1): 2,
    (2, 2): 3,
    (2, 3): 4,
    (3, 1): 3,
    (3, 2): 4,
    (3, 3): 4,
}

PRIORITY_LABELS = {
    1: "1 - Critical",
    2: "2 - High",
    3: "3 - Moderate",
    4: "4 - Low",
}

IMPACT_URGENCY_LABELS = {
    1: "1 - High",
    2: "2 - Medium",
    3: "3 - Low",
}


def calculate_priority(impact: int, urgency: int) -> int:
    if impact not in (1, 2, 3) or urgency not in (1, 2, 3):
        raise ValueError("impact and urgency must be 1, 2, or 3")
    return PRIORITY_MATRIX[(impact, urgency)]
