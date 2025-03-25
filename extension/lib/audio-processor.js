// Brainwave Extension - Audio Processor
// Utility functions for audio processing

/**
 * Converts Float32Array audio data to Int16Array format
 * @param {Float32Array} floatData - Audio data in Float32 format
 * @returns {Int16Array} - Converted audio data in Int16 format
 */
function floatToInt16(floatData) {
  const int16Data = new Int16Array(floatData.length);
  for (let i = 0; i < floatData.length; i++) {
    // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
    const sample = Math.max(-1, Math.min(1, floatData[i]));
    int16Data[i] = Math.round(sample * 32767);
  }
  return int16Data;
}

/**
 * Simple resampler for audio data (note: this is a very basic implementation)
 * For production use, a more sophisticated algorithm would be needed
 * @param {Int16Array} audioData - The original audio data
 * @param {number} originalSampleRate - The original sample rate
 * @param {number} targetSampleRate - The target sample rate
 * @returns {Int16Array} - Resampled audio data
 */
function resampleAudio(audioData, originalSampleRate, targetSampleRate) {
  if (originalSampleRate === targetSampleRate) {
    return audioData;
  }
  
  const ratio = originalSampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Int16Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    // Simple linear interpolation
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    
    if (index >= audioData.length - 1) {
      result[i] = audioData[audioData.length - 1];
    } else {
      result[i] = Math.round(
        audioData[index] * (1 - fraction) + 
        audioData[index + 1] * fraction
      );
    }
  }
  
  return result;
}

/**
 * Process raw audio data
 * @param {Float32Array} rawAudio - Raw audio data from audioprocess event
 * @param {number} inputSampleRate - Original sample rate
 * @param {number} outputSampleRate - Target sample rate
 * @returns {Int16Array} - Processed audio data ready for transmission
 */
function processAudio(rawAudio, inputSampleRate, outputSampleRate) {
  // Convert to Int16
  const int16Data = floatToInt16(rawAudio);
  
  // Resample
  return resampleAudio(int16Data, inputSampleRate, outputSampleRate);
}

// Export functions if in a module context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    floatToInt16,
    resampleAudio,
    processAudio
  };
} 