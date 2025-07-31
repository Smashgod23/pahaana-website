import tensorflow as tf
model = tf.keras.models.load_model("final_action_model.h5")
print(model.input_shape)