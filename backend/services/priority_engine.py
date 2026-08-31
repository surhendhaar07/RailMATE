from typing import Dict, Any

def get_priority_level(score: float) -> str:
    """Classifies priority score (0-100) into levels."""
    if score >= 80:
        return "CRITICAL"
    elif score >= 60:
        return "HIGH"
    elif score >= 40:
        return "MEDIUM"
    else:
        return "LOW"

def calculate_priority_score(
    criticality: int,            # 1-10
    failure_risk_prob: float,    # 0.0-1.0
    overdue_days: int,           # >= 0
    defect_severity: int,        # 0-10
    train_impact_score: float    # 0-100
) -> Dict[str, Any]:
    """
    Calculates composite Priority Score (0-100):
    30% * Asset Criticality
    25% * Failure Risk
    20% * Overdue Factor
    15% * Defect Severity
    10% * Train/Operational Impact
    """
    # 1. Normalize Criticality: 1-10 -> 0-100
    norm_criticality = (criticality / 10.0) * 100.0

    # 2. Normalize Failure Risk: 0.0-1.0 -> 0-100
    norm_risk = failure_risk_prob * 100.0

    # 3. Normalize Overdue Factor: Cap at 90 days
    norm_overdue = min(overdue_days / 90.0, 1.0) * 100.0

    # 4. Normalize Defect Severity: 0-10 -> 0-100
    norm_severity = (defect_severity / 10.0) * 100.0

    # 5. Operational Impact: Already 0-100
    norm_operational = train_impact_score

    # Weighted Sum
    score = (
        0.30 * norm_criticality +
        0.25 * norm_risk +
        0.20 * norm_overdue +
        0.15 * norm_severity +
        0.10 * norm_operational
    )
    
    score = round(max(0.0, min(100.0, score)), 2)
    level = get_priority_level(score)

    return {
        "score": score,
        "level": level,
        "factors": {
            "criticality_score": round(norm_criticality, 2),
            "risk_score": round(norm_risk, 2),
            "overdue_score": round(norm_overdue, 2),
            "severity_score": round(norm_severity, 2),
            "operational_score": round(norm_operational, 2)
        }
    }
