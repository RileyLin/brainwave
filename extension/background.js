// Brainwave Extension - Background Service Worker
// Handles WebSocket connection and audio processing

// Configuration
const config = {
  websocketUrl: 'ws://localhost:3005/api/v1/ws',
  targetSampleRate: 24000,
  sourceSampleRate: 48000
};

// State
let ws = null;
let isRecording = false;
let audioBuffer = [];
let activeTabId = null;
let activeFieldInfo = null;
let currentTranscription = '';

// Initialize settings with defaults
chrome.storage.local.get(['websocketUrl', 'autoFill', 'currentTranscription'], (result) => {
  if (result.websocketUrl) {
    config.websocketUrl = result.websocketUrl;
  } else {
    chrome.storage.local.set({ websocketUrl: config.websocketUrl });
  }
  
  if (result.autoFill === undefined) {
    chrome.storage.local.set({ autoFill: true });
  }
  
  if (result.currentTranscription) {
    currentTranscription = result.currentTranscription;
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch(message.action) {
    case 'START_RECORDING':
      startRecording();
      sendResponse({ status: 'recording_started' });
      break;
      
    case 'STOP_RECORDING':
      stopRecording();
      sendResponse({ status: 'recording_stopped' });
      break;
      
    case 'GET_STATUS':
      sendResponse({ 
        isRecording,
        wsStatus: ws ? ws.readyState : 'closed'
      });
      break;
      
    case 'UPDATE_SETTINGS':
      if (message.settings.websocketUrl) {
        config.websocketUrl = message.settings.websocketUrl;
        chrome.storage.local.set({ websocketUrl: config.websocketUrl });
      }
      sendResponse({ status: 'settings_updated' });
      break;
      
    case 'FIELD_FOCUSED':
      activeFieldInfo = message.fieldData;
      activeTabId = sender.tab.id;
      sendResponse({ status: 'field_info_updated' });
      break;
      
    case 'GET_TRANSCRIPTION':
      sendResponse({ 
        transcription: currentTranscription 
      });
      break;
  }
  
  return true; // Keep the message channel open for async response
});

// WebSocket handling
function initializeWebSocket() {
  if (ws) {
    ws.close();
  }
  
  try {
    ws = new WebSocket(config.websocketUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      broadcastStatus('connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed');
      broadcastStatus('disconnected');
      ws = null;
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      broadcastStatus('error');
    };
    
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
    broadcastStatus('error');
  }
}

function handleWebSocketMessage(data) {
  switch(data.type) {
    case 'status':
      broadcastStatus(data.status);
      break;
      
    case 'text':
      // Update the current transcription
      if (data.isNewResponse) {
        currentTranscription = data.content;
      } else {
        currentTranscription += data.content;
      }
      
      // Save to storage
      chrome.storage.local.set({ currentTranscription });
      
      // Send to popup
      chrome.runtime.sendMessage({ 
        action: 'TRANSCRIPT_UPDATE', 
        text: data.content,
        isNewResponse: data.isNewResponse
      });
      
      // Send to active tab if available
      if (activeTabId) {
        chrome.tabs.sendMessage(activeTabId, { 
          action: 'INJECT_TEXT',
          text: data.content,
          isNewResponse: data.isNewResponse
        });
      }
      break;
      
    case 'error':
      console.error('Server error:', data.content);
      broadcastStatus('error', data.content);
      break;
  }
}

function broadcastStatus(status, errorMessage = null) {
  chrome.runtime.sendMessage({ 
    action: 'STATUS_UPDATE', 
    status,
    error: errorMessage
  });
}

// Recording functions
async function startRecording() {
  if (isRecording) return;
  
  try {
    // Initialize WebSocket
    initializeWebSocket();
    
    // Request tab audio capture
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    // Process audio and send to server
    processAudioStream(stream);
    
    // Update state
    isRecording = true;
    broadcastStatus('recording');
    
    // Notify server to start recording
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'start_recording' }));
    }
  } catch (error) {
    console.error('Failed to start recording:', error);
    broadcastStatus('error', error.message);
  }
}

function stopRecording() {
  if (!isRecording) return;
  
  isRecording = false;
  broadcastStatus('stopped');
  
  if (ws) {
    ws.send(JSON.stringify({ type: 'stop_recording' }));
  }
}

// Audio processing
function processAudioStream(stream) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  
  processor.onaudioprocess = (e) => {
    if (!isRecording) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    
    const inputData = e.inputBuffer.getChannelData(0);
    const pcmData = new Int16Array(inputData.length);
    
    // Convert Float32 to Int16
    for (let i = 0; i < inputData.length; i++) {
      pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32767)));
    }
    
    // Resample if needed (simplified version - actual resampling would be more complex)
    // In a production extension, we would use a proper resampler
    const resampledData = pcmData;
    
    // Send to WebSocket if open
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(resampledData.buffer);
    }
  };
  
  source.connect(processor);
  processor.connect(audioContext.destination);
} 