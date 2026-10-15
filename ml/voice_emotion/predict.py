from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np

from features import extract_voice_feature_vector

MODEL_PATH = Path(__file__).resolve().parent / "model" / "voice_emotion_svm.joblib"
SCALER_PATH = Path(__file__).resolve().parent / "model" / "scaler.joblib"


def predict_emotion(audio_path: str | Path):
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    feature_vector = extract_voice_feature_vector(audio_path)
    scaled = scaler.transform(feature_vector.reshape(1, -1))
    prediction = model.predict(scaled)[0]
    return str(prediction)


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        raise SystemExit("Usage: python predict.py /path/to/audio.wav")
    print(predict_emotion(sys.argv[1]))
