from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from dataset import iter_ravdess_audio
from features import extract_voice_feature_vector

DATASET_ROOT = Path(__file__).resolve().parents[2] / "DATASET"
MODEL_DIR = Path(__file__).resolve().parent / "model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def build_dataset(dataset_root: str | Path):
    features = []
    labels = []
    for file_path, emotion in iter_ravdess_audio(dataset_root):
        try:
            vector = extract_voice_feature_vector(file_path)
        except Exception:
            continue
        features.append(vector)
        labels.append(emotion)

    if not features:
        raise RuntimeError(
            "No audio files were available for training. Place the RAVDESS speech files in DATASET/ before training."
        )

    return np.vstack(features), np.asarray(labels)


if __name__ == "__main__":
    X, y = build_dataset(DATASET_ROOT)
    class_labels = sorted(set(y.tolist()))
    class_to_idx = {label: idx for idx, label in enumerate(class_labels)}
    y_idx = np.asarray([class_to_idx[label] for label in y], dtype=np.int64)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_idx,
        test_size=0.2,
        random_state=42,
        stratify=y_idx,
    )

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(kernel="rbf", probability=True, class_weight="balanced", C=2.0, gamma="scale")),
    ])
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Validation accuracy: {accuracy:.3f}")
    print(classification_report(y_test, predictions, target_names=[str(label) for label in class_labels], zero_division=0))

    joblib.dump(model.named_steps["svm"], MODEL_DIR / "voice_emotion_svm.joblib")
    joblib.dump(model.named_steps["scaler"], MODEL_DIR / "scaler.joblib")
    print(f"Saved model and scaler to {MODEL_DIR}")
