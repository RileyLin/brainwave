// Brainwave Extension - Content Script
// Handles field detection and text injection

// Keep track of the latest focused input element
let activeElement = null;
let currentTranscriptionText = '';
let isAutoFillEnabled = true;

// Get settings from storage
chrome.storage.local.get(['autoFill'], (result) => {
  isAutoFillEnabled = result.autoFill !== false;
});

// Listen for focus events on input fields and textareas
document.addEventListener('focusin', (e) => {
  if (isTextInputElement(e.target)) {
    activeElement = e.target;
    notifyBackgroundAboutField(activeElement);
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'INJECT_TEXT') {
    handleTextInjection(message.text, message.isNewResponse);
    sendResponse({ status: 'text_injected' });
  }
  return true;
});

// Helper function to check if an element is a text input or textarea
function isTextInputElement(element) {
  if (!element) return false;
  
  const nodeName = element.nodeName.toLowerCase();
  if (nodeName === 'textarea') return true;
  
  if (nodeName === 'input') {
    const type = element.type && element.type.toLowerCase();
    return type === 'text' || 
           type === 'search' || 
           type === 'email' || 
           type === 'url' || 
           type === 'tel';
  }
  
  // Check for contenteditable elements (like in Gmail, Discord, etc.)
  return element.isContentEditable;
}

// Send information about the focused field to the background script
function notifyBackgroundAboutField(element) {
  if (!element) return;
  
  let fieldData = {
    tagName: element.tagName.toLowerCase(),
    id: element.id || '',
    name: element.name || '',
    className: element.className || '',
    placeholder: element.placeholder || '',
    isContentEditable: element.isContentEditable || false
  };
  
  chrome.runtime.sendMessage({
    action: 'FIELD_FOCUSED',
    fieldData
  });
}

// Handle text injection into the active element
function handleTextInjection(text, isNewResponse) {
  if (!text) return;
  
  // If not auto-filling, just store the current transcription
  if (!isAutoFillEnabled) {
    if (isNewResponse) {
      currentTranscriptionText = text;
    } else {
      currentTranscriptionText += text;
    }
    return;
  }
  
  // Find the active element
  const element = activeElement || document.activeElement;
  
  if (!isTextInputElement(element)) {
    console.warn('No suitable active text input element found for injection');
    return;
  }
  
  // Different handling based on element type
  if (element.isContentEditable) {
    injectIntoContentEditable(element, text, isNewResponse);
  } else {
    injectIntoInputOrTextarea(element, text, isNewResponse);
  }
}

// Inject text into regular input fields or textareas
function injectIntoInputOrTextarea(element, text, isNewResponse) {
  // For new responses, replace existing text
  if (isNewResponse) {
    element.value = text;
  } else {
    element.value += text;
  }
  
  // Trigger input event for frameworks that track input changes
  element.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Scroll to end and focus
  element.scrollTop = element.scrollHeight;
  element.focus();
}

// Inject text into contenteditable elements (like in chat apps)
function injectIntoContentEditable(element, text, isNewResponse) {
  if (isNewResponse) {
    // Clear existing content
    element.innerHTML = '';
  }
  
  // Create a text node and append it
  const textNode = document.createTextNode(text);
  element.appendChild(textNode);
  
  // Trigger input event
  element.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Set cursor at the end
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false); // Collapse to end
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Focus
  element.focus();
} 