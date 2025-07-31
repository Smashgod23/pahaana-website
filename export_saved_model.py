import tensorflow as tf
model = tf.keras.models.load_model("final_action_model.h5")

inputs = tf.keras.Input(shape=(5, 66))  # replace with your input shape
outputs = model(inputs)
model_fixed = tf.keras.Model(inputs, outputs)

tf.saved_model.save(model_fixed, "./saved_model")