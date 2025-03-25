// Brainwave Extension - Popup Script

// DOM Elements
const recordButton = document.getElementById('recordButton');
const statusIndicator = document.getElementById('statusIndicator');
const timerElement = document.getElementById('timer');
const autoFillToggle = document.getElementById('autoFillToggle');
const serverUrlInput = document.getElementById('serverUrl');
const settingsButton = document.getElementById('settingsButton');
const transcriptText = document.getElementById('transcriptText');
const copyButton = document.getElementById('copyButton');

// State
let isRecording = false;
let timerInterval = null;
let startTime = 0;
let currentTranscription = '';

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
  // Load settings
  chrome.storage.local.get(['websocketUrl', 'autoFill', 'currentTranscription'], (result) => {
    if (result.websocketUrl) {
      serverUrlInput.value = result.websocketUrl;
    }
    
    if (result.autoFill !== undefined) {
      autoFillToggle.checked = result.autoFill;
    }
    
    if (result.currentTranscription) {
      currentTranscription = result.currentTranscription;
      transcriptText.value = currentTranscription;
    }
  });
  
  // Get current status
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
    if (response) {
      isRecording = response.isRecording;
      updateRecordButtonState();
      
      if (response.wsStatus === WebSocket.OPEN) {
        setStatusIndicator('connected');
      }
    }
  });
  
  // Set up event listeners
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  recordButton.addEventListener('click', toggleRecording);
  
  copyButton.addEventListener('click', () => {
    copyTextToClipboard(transcriptText.value);
  });
  
  settingsButton.addEventListener('click', () => {
    const settings = {
      websocketUrl: serverUrlInput.value,
      autoFill: autoFillToggle.checked
    };
    
    chrome.storage.local.set(settings, () => {
      chrome.runtime.sendMessage({ 
        action: 'UPDATE_SETTINGS', 
        settings 
      }, (response) => {
        if (response && response.status === 'settings_updated') {
          showSettingsSaved();
        }
      });
    });
  });
  
  // Listen for status updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'STATUS_UPDATE') {
      handleStatusUpdate(message.status, message.error);
    } else if (message.action === 'TRANSCRIPT_UPDATE') {
      updateTranscriptText(message.text, message.isNewResponse);
    }
    return true;
  });
}

// Recording functions
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  chrome.runtime.sendMessage({ action: 'START_RECORDING' }, (response) => {
    if (response && response.status === 'recording_started') {
      isRecording = true;
      updateRecordButtonState();
      startTimer();
      setStatusIndicator('connecting');
    }
  });
}

function stopRecording() {
  chrome.runtime.sendMessage({ action: 'STOP_RECORDING' }, (response) => {
    if (response && response.status === 'recording_stopped') {
      isRecording = false;
      updateRecordButtonState();
      stopTimer();
    }
  });
}

// Transcript handling
function updateTranscriptText(text, isNewResponse) {
  if (isNewResponse) {
    currentTranscription = text;
  } else {
    currentTranscription += text;
  }
  
  transcriptText.value = currentTranscription;
  
  // Save the current transcription to storage
  chrome.storage.local.set({ currentTranscription });
  
  // Auto-scroll to bottom
  transcriptText.scrollTop = transcriptText.scrollHeight;
}

function copyTextToClipboard(text) {
  if (!text) return;
  
  navigator.clipboard.writeText(text)
    .then(() => {
      showCopiedFeedback();
    })
    .catch(err => {
      console.error('Could not copy text: ', err);
    });
}

function showCopiedFeedback() {
  const originalText = copyButton.textContent;
  copyButton.textContent = 'Copied!';
  
  setTimeout(() => {
    copyButton.textContent = originalText;
  }, 2000);
}

// UI Updates
function updateRecordButtonState() {
  if (isRecording) {
    recordButton.textContent = 'Stop Recording';
    recordButton.classList.add('recording');
  } else {
    recordButton.textContent = 'Start Recording';
    recordButton.classList.remove('recording');
  }
}

function setStatusIndicator(status) {
  statusIndicator.className = 'status-indicator';
  
  switch(status) {
    case 'connected':
      statusIndicator.classList.add('connected');
      break;
    case 'connecting':
    case 'recording':
      statusIndicator.classList.add('connecting');
      break;
    case 'error':
      statusIndicator.classList.add('error');
      break;
    default:
      // Default gray
      break;
  }
}

function handleStatusUpdate(status, errorMessage) {
  setStatusIndicator(status);
  
  if (status === 'error' && errorMessage) {
    // Show error notification
    console.error('Error:', errorMessage);
  }
  
  if (status === 'stopped') {
    isRecording = false;
    updateRecordButtonState();
    stopTimer();
  }
}

function showSettingsSaved() {
  const originalText = settingsButton.textContent;
  settingsButton.textContent = 'Saved!';
  
  setTimeout(() => {
    settingsButton.textContent = originalText;
  }, 2000);
}

// Timer
function startTimer() {
  clearInterval(timerInterval);
  timerElement.textContent = '00:00';
  startTime = Date.now();
  
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timerElement.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
} 