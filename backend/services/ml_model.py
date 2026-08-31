import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "failure_risk_model.joblib")

def generate_synthetic_training_data():
    """Generates synthetic historical training data for asset failures."""
    np.random.seed(42)
    n_samples = 1500

    # Features:
    # 1. asset_age: 0 to 30 years
    asset_age = np.random.randint(0, 31, size=n_samples)
    # 2. criticality: 1 to 10
    criticality = np.random.randint(1, 11, size=n_samples)
    # 3. defect_severity: 0 to 10 (0 means no active defect)
    defect_severity = np.random.randint(0, 11, size=n_samples)
    # 4. overdue_days: 0 to 120 days
    overdue_days = np.random.randint(0, 121, size=n_samples)
    # 5. previous_failures: 0 to 5 failures
    previous_failures = np.random.randint(0, 6, size=n_samples)
    # 6. maintenance_frequency: times per year (1 to 12)
    maintenance_frequency = np.random.randint(1, 13, size=n_samples)

    # Calculate logit for failure probability
    # Higher age, criticality, severity, overdue, previous failures raise risk
    # Higher maintenance frequency reduces risk
    logit = (
        0.05 * asset_age +
        0.08 * criticality +
        0.15 * defect_severity +
        0.02 * overdue_days +
        0.30 * previous_failures -
        0.10 * maintenance_frequency -
        1.5 # intercept
    )
    
    # Sigmoid function to get probability
    prob = 1 / (1 + np.exp(-logit))
    # Binary target (failed or not)
    failed = (prob + np.random.normal(0, 0.1, n_samples) > 0.55).astype(int)
    
    df = pd.DataFrame({
        "asset_age": asset_age,
        "criticality": criticality,
        "defect_severity": defect_severity,
        "overdue_days": overdue_days,
        "previous_failures": previous_failures,
        "maintenance_frequency": maintenance_frequency,
        "failed": failed
    })
    return df

def train_and_save_model():
    """Trains a Random Forest model on synthetic data and saves it."""
    print("Training ML Failure Risk Model on synthetic historical data...")
    df = generate_synthetic_training_data()
    X = df[["asset_age", "criticality", "defect_severity", "overdue_days", "previous_failures", "maintenance_frequency"]]
    y = df["failed"]

    model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=8)
    model.fit(X, y)
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved successfully to {MODEL_PATH}")
    return model

def load_model():
    """Loads the model, training it first if not found."""
    if not os.path.exists(MODEL_PATH):
        return train_and_save_model()
    return joblib.load(MODEL_PATH)

# Load the model eagerly on import or when first required
try:
    _model = load_model()
except Exception as e:
    print(f"Error loading failure risk model: {e}. Will train a new model.")
    _model = train_and_save_model()

def predict_failure_risk(
    asset_age: int,
    criticality: int,
    defect_severity: int,
    overdue_days: int,
    previous_failures: int,
    maintenance_frequency: int
) -> float:
    """
    Predicts the failure probability (0.0 to 1.0) of an asset.
    Labeled as Prototype / Synthetic Data Prediction.
    """
    global _model
    if _model is None:
        try:
            _model = load_model()
        except Exception:
            _model = train_and_save_model()
            
    input_features = np.array([[
        asset_age,
        criticality,
        defect_severity,
        overdue_days,
        previous_failures,
        maintenance_frequency
    ]])
    
    # Get probability of class 1 (failed)
    probs = _model.predict_proba(input_features)[0]
    # Class 1 is usually at index 1
    return float(probs[1])
