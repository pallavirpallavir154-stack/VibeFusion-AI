import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import tensorflow as tf
from tensorflow.keras import Sequential
from tensorflow.keras.layers import Dense, Dropout

# Setup absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, 'gesture_dataset.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'gesture_classifier.h5')
MAPPING_PATH = os.path.join(BASE_DIR, 'gesture_mapping.json')

def preprocess_row(landmarks_flat):
    # landmarks_flat contains 63 floats (21 landmarks * 3 coordinates)
    coords = np.array(landmarks_flat).reshape(21, 3)
    # Translate so wrist (index 0) is at origin (0, 0, 0)
    wrist = coords[0]
    shifted = coords - wrist
    # Scale to unit max distance
    dists = np.linalg.norm(shifted, axis=1)
    max_dist = np.max(dists)
    if max_dist > 0:
        normalized = shifted / max_dist
    else:
        normalized = shifted
    return normalized.flatten()

def train():
    print("Starting VibeFusion Ai TensorFlow gesture classifier training...")
    
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset CSV not found at: {DATASET_PATH}. Please collect dataset first.")

    # Load dataset
    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded dataset with {len(df)} samples.")
    
    # Extract labels and coordinates
    labels = df.iloc[:, 0].values
    X_raw = df.iloc[:, 1:].values
    
    # Preprocess all samples
    print("Normalizing hand coordinate landmark coordinates...")
    X = np.array([preprocess_row(row) for row in X_raw])
    
    # Encode label strings to integer targets
    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(labels)
    num_classes = len(encoder.classes_)
    
    # Save label mappings for prediction inference matching
    label_mapping = {int(i): str(cls) for i, cls in enumerate(encoder.classes_)}
    with open(MAPPING_PATH, 'w') as f:
        json.dump(label_mapping, f, indent=2)
    print(f"Saved label mappings: {label_mapping}")
    
    # One-hot encode targets
    y = tf.keras.utils.to_categorical(y_encoded, num_classes=num_classes)
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y_encoded)
    
    # Build MLP Sequential Neural Network Model
    model = Sequential([
        Dense(64, input_shape=(63,), activation='relu'),
        Dropout(0.2),
        Dense(32, activation='relu'),
        Dropout(0.1),
        Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    print("Training TensorFlow neural network model...")
    history = model.fit(
        X_train, y_train,
        epochs=30,
        batch_size=8,
        validation_data=(X_test, y_test),
        verbose=1
    )
    
    # Evaluate model accuracy
    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"Model validation accuracy: {accuracy * 100:.2f}% (Loss: {loss:.4f})")
    
    # Save model binary file
    model.save(MODEL_PATH)
    print(f"Successfully saved TensorFlow gesture model file to: {MODEL_PATH}")
    return accuracy

if __name__ == '__main__':
    train()
