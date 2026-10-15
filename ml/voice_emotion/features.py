from __future__ import annotations

from pathlib import Path

import librosa
import numpy as np


def load_audio(audio_path: str | Path, sr: int = 16000):
    y, _ = librosa.load(audio_path, sr=sr, mono=True)
    y = np.asarray(y, dtype=np.float32)
    if y.size == 0:
        raise ValueError(f"No audio data found in {audio_path}")
    y = y - np.mean(y)
    y = y / (np.std(y) + 1e-8)
    return y, sr


def extract_mfcc(y: np.ndarray, sr: int, n_mfcc: int = 13):
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    return np.mean(mfcc, axis=1)


def extract_pitch(y: np.ndarray, sr: int):
    pitches, _ = librosa.core.piptrack(y=y, sr=sr, fmin=50, fmax=2000)
    values = pitches[pitches > 0]
    return float(np.median(values)) if values.size else 0.0


def extract_rms_energy(y: np.ndarray):
    rms = librosa.feature.rms(y=y)
    return float(np.mean(rms))


def extract_zero_crossing_rate(y: np.ndarray):
    zcr = librosa.feature.zero_crossing_rate(y)
    return float(np.mean(zcr))


def extract_spectral_features(y: np.ndarray, sr: int):
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    return {
        "spectral_centroid": float(np.mean(spectral_centroid)),
        "spectral_rolloff": float(np.mean(spectral_rolloff)),
        "chroma_mean": float(np.mean(chroma)),
    }


def extract_voice_feature_vector(audio_path: str | Path):
    y, sr = load_audio(audio_path, sr=16000)
    feature_vector = [
        *extract_mfcc(y, sr, n_mfcc=13).tolist(),
        extract_pitch(y, sr),
        extract_rms_energy(y),
        extract_zero_crossing_rate(y),
        extract_spectral_features(y, sr)["spectral_centroid"],
        extract_spectral_features(y, sr)["spectral_rolloff"],
        extract_spectral_features(y, sr)["chroma_mean"],
    ]
    return np.asarray(feature_vector, dtype=np.float32)
