from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

from dataset import iter_ravdess_audio
from features import extract_voice_feature_vector

DATASET_ROOT = Path(__file__).resolve().parents[2] / "DATASET"
MODEL_PATH = Path(__file__).resolve().parent / "model" / "voice_emotion_svm.joblib"
SCALER_PATH = Path(__file__).resolve().parent / "model" / "scaler.joblib"


def load_dataset(dataset_root: str | Path):
    features = []
    labels = []
    for file_path, emotion in iter_ravdess_audio(dataset_root):
        try:
            features.append(extract_voice_feature_vector(file_path))
            labels.append(emotion)
        except Exception:
            continue
    return np.vstack(features), np.asarray(labels)


if __name__ == "__main__":
    X, y = load_dataset(DATASET_ROOT)
    class_names = sorted(set(y.tolist()))
    class_to_idx = {label: idx for idx, label in enumerate(class_names)}
    y_idx = np.asarray([class_to_idx[label] for label in y], dtype=np.int64)
    _, X_valid, _, y_valid = train_test_split(X, y_idx, test_size=0.2, random_state=42, stratify=y_idx)

    scaler = joblib.load(SCALER_PATH)
    model = joblib.load(MODEL_PATH)
    X_valid = scaler.transform(X_valid)
    preds = model.predict(X_valid)

    print(f"Accuracy: {accuracy_score(y_valid, preds):.3f}")
    print(classification_report(y_valid, preds, target_names=class_names, zero_division=0))
