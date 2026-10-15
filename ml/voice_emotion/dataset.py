from __future__ import annotations

from pathlib import Path

EMOTION_NAMES = {
    "01": "neutral",
    "02": "calm",
    "03": "happy",
    "04": "sad",
    "05": "angry",
    "06": "fearful",
    "07": "disgust",
    "08": "surprised",
}


def iter_ravdess_audio(root: str | Path):
    """Yield RAVDESS speech files and their emotion labels."""
    dataset_root = Path(root)
    if not dataset_root.exists():
        raise FileNotFoundError(
            f"RAVDESS dataset was not found at {dataset_root}. "
            "Download the speech subset from Zenodo before training."
        )

    for file_path in sorted(dataset_root.rglob("*.wav")):
        filename = file_path.name
        if len(filename) < 7:
            continue
        emotion_key = filename.split("-")[2]
        emotion = EMOTION_NAMES.get(emotion_key, "unknown")
        if emotion in {"unknown", "calm", "disgust"}:
            continue
        yield file_path, emotion
