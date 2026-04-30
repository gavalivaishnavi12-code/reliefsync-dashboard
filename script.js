const appState = {
  showMarkers: true,
  selectedRequestId: null,
  skillFilter: 'all',
  urgencyFilter: 'all',
  search: ''
};

const baseRequests = [
  { id: 'REQ-101', title: 'Medical camp support', area: 'Shivajinagar', lat: 18.5319, lng: 73.8565, requiredSkills: ['medical', 'logistics'], urgency: 5, peopleNeeded: 8, timeSlot: 'morning', status: 'open', description: 'First-aid desk and medicine queue support.' },
  { id: 'REQ-102', title: 'Supply distribution', area: 'Hadapsar', lat: 18.5089, lng: 73.9267, requiredSkills: ['logistics'], urgency: 4, peopleNeeded: 10, timeSlot: 'afternoon', status: 'open', description: 'Pack and distribute food and hygiene kits.' },
  { id: 'REQ-103', title: 'Child safe-space teaching', area: 'Kothrud', lat: 18.5123, lng: 73.7865, requiredSkills: ['teaching'], urgency: 3, peopleNeeded: 4, timeSlot: 'afternoon', status: 'open', description: 'Run learning and engagement sessions.' },
  { id: 'REQ-104', title: 'Evacuation support', area: 'Wakad', lat: 18.5967, lng: 73.7657, requiredSkills: ['rescue', 'logistics'], urgency: 5, peopleNeeded: 6, timeSlot: 'morning', status: 'open', description: 'Guide families to transport assembly points.' },
  { id: 'REQ-105', title: 'Shelter registration desk', area: 'Baner', lat: 18.5591, lng: 73.7706, requiredSkills: ['logistics', 'teaching'], urgency: 3, peopleNeeded: 3, timeSlot: 'evening', status: 'open', description: 'Register arrivals and coordinate family desks.' },
  { id: 'REQ-106', title: 'Mobile health visit', area: 'Hinjewadi', lat: 18.5907, lng: 73.7387, requiredSkills: ['medical'], urgency: 4, peopleNeeded: 5, timeSlot: 'evening', status: 'open', description: 'Nursing and triage support for mobile van.' },
  { id: 'REQ-107', title: 'Relief camp orientation', area: 'Koregaon Park', lat: 18.5362, lng: 73.8953, requiredSkills: ['teaching', 'logistics'], urgency: 2, peopleNeeded: 4, timeSlot: 'morning', status: 'open', description: 'Guide new arrivals and explain support flows.' },
  { id: 'REQ-108', title: 'Medicine inventory audit', area: 'Viman Nagar', lat: 18.5673, lng: 73.9143, requiredSkills: ['medical', 'logistics'], urgency: 4, peopleNeeded: 3, timeSlot: 'afternoon', status: 'open', description: 'Verify stock, expiry, and issue records.' }
];

const baseVolunteers = [
  { id: 'VOL-01', name: 'Aarav N', skills: ['medical', 'logistics'], lat: 18.5300, lng: 73.8550, availability: ['morning', 'afternoon'], status: 'available' },
  { id: 'VOL-02', name: 'Diya R', skills: ['teaching'], lat: 18.5100, lng: 73.7900, availability: ['afternoon', 'evening'], status: 'available' },
  { id: 'VOL-03', name: 'Rohit M', skills: ['logistics', 'rescue'], lat: 18.5950, lng: 73.7700, availability: ['morning'], status: 'available' },
  { id: 'VOL-04', name: 'Sana P', skills: ['medical'], lat: 18.5400, lng: 73.9000, availability: ['evening'], status: 'available' },
  { id: 'VOL-05', name: 'Nikhil S', skills: ['logistics', 'teaching'], lat: 18.4800, lng: 73.8200, availability: ['evening', 'afternoon'], status: 'available' },
  { id: 'VOL-06', name: 'Meera K', skills: ['medical', 'teaching'], lat: 18.5200, lng: 73.8600, availability: ['morning', 'evening'], status: 'available' },
  { id: 'VOL-07', name: 'Aditya V', skills: ['rescue'], lat: 18.6000, lng: 73.7400, availability: ['morning', 'afternoon'], status: 'available' },
  { id: 'VOL-08', name: 'Pooja L', skills: ['logistics'], lat: 18.4600, lng: 73.8700, availability: ['afternoon'], status: 'available' },
  { id: 'VOL-09', name: 'Ishaan T', skills: ['medical', 'rescue'], lat: 18.5500, lng: 73.8800, availability: ['morning'], status: 'available' },
  { id: 'VOL-10', name: 'Kavya D', skills: ['teaching', 'logistics'], lat: 18.5800, lng: 73.7500, availability: ['morning', 'afternoon'], status: 'available' }
];

let requests = structuredClone(baseRequests);
let volunteers = structuredClone(baseVolunteers);
let assignmentsCount = 11;
let map, heatLayer, markerLayer;

const requestListEl = document.getElementById('requestList');
const matchListEl = document.getElementById('matchList');
const selectedRequestLabel = document.getElementById('selectedRequestLabel');

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function calculateMatches(request) {
  return volunteers
    .filter(v => v.status === 'available')
    .map(v => {
      const matchedSkills = request.requiredSkills.filter(skill => v.skills.includes(skill)).length;
      const skillScore = matchedSkills / request.requiredSkills.length;
      const availabilityScore = v.availability.includes(request.timeSlot) ? 1 : 0;
      const distanceKm = haversine(request.lat, request.lng, v.lat, v.lng);
      const distanceScore = Math.max(0, 1 - distanceKm / 25);
      const urgencyBonus = request.urgency / 5;
      const totalScore = 0.45 * skillScore + 0.25 * availabilityScore + 0.20 * distanceScore + 0.10 * urgencyBonus;
      return { ...v, distanceKm, skillScore, availabilityScore, distanceScore, urgencyBonus, totalScore };
    })
    .filter(v => v.skillScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);
}

function getHeatWeight(request) {
  const statusFactor = request.status === 'open' ? 1 : 0.4;
  return (request.urgency / 5) * Math.min(1, request.peopleNeeded / 10) * statusFactor;
}

function getFilteredRequests() {
  return requests.filter(req => {
    const skillOk = appState.skillFilter === 'all' || req.requiredSkills.includes(appState.skillFilter);
    const urgencyOk = appState.urgencyFilter === 'all' || String(req.urgency) === appState.urgencyFilter;
    const searchText = `${req.title} ${req.area} ${req.requiredSkills.join(' ')}`.toLowerCase();
    const searchOk = !appState.search || searchText.includes(appState.search);
    return skillOk && urgencyOk && searchOk;
  });
}

function urgencyLabel(level) {
  if (level >= 5) return 'Critical';
  if (level >= 4) return 'High';
  if (level >= 3) return 'Medium';
  return 'Low';
}

function updateAIInsights() {
  const criticalReqs = requests.filter(r => r.urgency >= 4 && r.status === 'open');
  const availableVols = volunteers.filter(v => v.status === 'available').length;
  let text = "System is running optimally. All requests are manageable.";

  if (criticalReqs.length > 0) {
    const topCritical = criticalReqs.sort((a, b) => b.urgency - a.urgency)[0];
    text = `High urgency detected in <strong>${topCritical.area}</strong> for ${topCritical.title.toLowerCase()}. `;
    if (availableVols < 5) {
      text += "Possible delay in response due to low overall volunteer availability.";
    } else {
      text += "Recommended volunteers ready based on skill match.";
    }
  } else if (availableVols > 15) {
    text = "High volunteer availability. Ready for any incoming alerts.";
  }

  const insightEl = document.getElementById('aiInsightsText');
  if (insightEl) insightEl.innerHTML = text;
}

function updateKPIs() {
  document.getElementById('kpiRequests').textContent = String(requests.filter(r => r.status === 'open').length).padStart(2, '0');
  document.getElementById('kpiVolunteers').textContent = String(volunteers.filter(v => v.status === 'available').length).padStart(2, '0');
  document.getElementById('kpiCritical').textContent = String(requests.filter(r => r.urgency >= 4 && r.status === 'open').length).padStart(2, '0');
  document.getElementById('kpiAssigned').textContent = String(assignmentsCount).padStart(2, '0');
  updateAIInsights();
}

function renderRequests() {
  const filtered = getFilteredRequests();
  requestListEl.innerHTML = filtered.map(req => `
    <article class="request-item ${appState.selectedRequestId === req.id ? 'active' : ''}" data-request-id="${req.id}" tabindex="0" role="button" aria-label="Open ${req.title}">
      <div class="request-top">
        <div>
          <h4 class="request-title">${req.title}</h4>
          <div class="muted tiny">${req.id} • ${req.area}</div>
        </div>
        <span class="chip ${req.urgency >= 5 ? 'high' : req.urgency >= 3 ? 'medium' : 'low'}">${urgencyLabel(req.urgency)}</span>
      </div>
      <p class="muted tiny">${req.description}</p>
      <div class="pill-row">${req.requiredSkills.map(skill => `<span class="pill">${skill}</span>`).join('')}</div>
      <div class="request-actions muted tiny">Need ${req.peopleNeeded} volunteers • ${req.timeSlot}</div>
    </article>
  `).join('');

  requestListEl.querySelectorAll('.request-item').forEach(el => {
    const open = () => selectRequest(el.dataset.requestId);
    el.addEventListener('click', open);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

function renderMatches(requestId) {
  const request = requests.find(r => r.id === requestId);
  if (!request) {
    matchListEl.innerHTML = '<div class="match-item"><p class="muted">Choose a relief request to compute volunteer scores.</p></div>';
    selectedRequestLabel.textContent = 'Select a request to view matches.';
    return;
  }
  selectedRequestLabel.textContent = `${request.title} • ${request.area} • ${urgencyLabel(request.urgency)} urgency`;
  const matches = calculateMatches(request);
  matchListEl.innerHTML = matches.map((m, index) => {
    const isTopMatch = index === 0;
    const badge = isTopMatch ? `<span class="ai-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg> Top Match</span>` : '';

    let aiExplanation = '';
    if (isTopMatch) {
      let reason = [];
      if (m.skillScore === 1) reason.push("100% skill match");
      else if (m.skillScore >= 0.5) reason.push("optimal skill match");

      if (m.distanceKm < 5) reason.push(`close proximity (${m.distanceKm.toFixed(1)}km)`);

      if (m.availabilityScore === 1) reason.push("matching time availability");

      aiExplanation = `
      <div class="ai-explanation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <div><strong>Why this volunteer is selected:</strong> Highest combined score (${(m.totalScore * 100).toFixed(0)}%) driven by ${reason.length > 0 ? reason.join(', ') : 'overall profile strength'} for this assignment.</div>
      </div>`;
    }

    return `
    <article class="match-item" style="animation-delay: ${index * 0.05}s">
      <div class="match-top">
        <div>
          <h4 class="match-name">#${index + 1} ${m.name} ${badge}</h4>
          <div class="muted tiny">${m.id} • ${m.distanceKm.toFixed(1)} km away • ${m.availability.join(', ')}</div>
        </div>
        <button class="assign-btn" data-assign-id="${m.id}">Assign</button>
      </div>
      <div class="pill-row">${m.skills.map(skill => `<span class="pill">${skill}</span>`).join('')}</div>
      <div class="match-metrics tiny muted">
        <span>Skill ${(m.skillScore * 100).toFixed(0)}%</span>
        <span>Availability ${(m.availabilityScore * 100).toFixed(0)}%</span>
        <span>Distance ${(m.distanceScore * 100).toFixed(0)}%</span>
        <span>Total ${(m.totalScore * 100).toFixed(0)}%</span>
      </div>
      <div class="score-bar"><div class="score-fill" style="width:${Math.max(8, m.totalScore * 100)}%"></div></div>
      ${aiExplanation}
    </article>
  `}).join('');

  matchListEl.querySelectorAll('[data-assign-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      assignmentsCount += 1;
      updateKPIs();
      btn.textContent = 'Assigned';
      btn.disabled = true;
    });
  });
}

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([18.5204, 73.8567], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  updateMapLayers();
}

function updateMapLayers() {
  const filtered = getFilteredRequests();
  if (heatLayer) map.removeLayer(heatLayer);
  markerLayer.clearLayers();
  const heatPoints = filtered.map(req => [req.lat, req.lng, Math.max(0.25, getHeatWeight(req))]);
  heatLayer = L.heatLayer(heatPoints, {
    radius: 30,
    blur: 28,
    maxZoom: 17,
    gradient: { 0.2: '#76aad4', 0.45: '#f0a74d', 0.75: '#e17281', 1.0: '#a13544' }
  }).addTo(map);

  if (appState.showMarkers) {
    filtered.forEach(req => {
      const marker = L.circleMarker([req.lat, req.lng], {
        radius: 7,
        fillColor: req.urgency >= 5 ? '#e17281' : req.urgency >= 4 ? '#f0a74d' : '#76aad4',
        color: '#ffffff', weight: 1.2, fillOpacity: 0.95
      });
      marker.bindPopup(`<strong>${req.title}</strong><br>${req.area}<br>Urgency: ${urgencyLabel(req.urgency)}<br>Need: ${req.peopleNeeded} volunteers`);
      marker.addTo(markerLayer);
    });
  }
}

function selectRequest(requestId) {
  appState.selectedRequestId = requestId;
  const request = requests.find(r => r.id === requestId);
  if (request) {
    map.flyTo([request.lat, request.lng], 13, { duration: 0.8 });
  }
  renderRequests();
  renderMatches(requestId);
}

function resetAll() {
  requests = structuredClone(baseRequests);
  volunteers = structuredClone(baseVolunteers);
  assignmentsCount = 11;
  appState.selectedRequestId = null;
  appState.skillFilter = 'all';
  appState.urgencyFilter = 'all';
  appState.search = '';
  document.getElementById('skillFilter').value = 'all';
  document.getElementById('urgencyFilter').value = 'all';
  document.getElementById('globalSearch').value = '';
  updateKPIs();
  renderRequests();
  renderMatches(null);
  updateMapLayers();
  map.flyTo([18.5204, 73.8567], 11, { duration: 0.8 });
}

function simulateNewAlert() {
  const newRequest = {
    id: 'REQ-109',
    title: 'Rapid medicine dispatch',
    area: 'Katraj',
    lat: 18.4469,
    lng: 73.8677,
    requiredSkills: ['medical', 'logistics'],
    urgency: 5,
    peopleNeeded: 7,
    timeSlot: 'evening',
    status: 'open',
    description: 'Urgent medicine and triage queue support.'
  };
  const exists = requests.some(r => r.id === newRequest.id);
  if (!exists) requests.unshift(newRequest);
  updateKPIs();
  renderRequests();
  updateMapLayers();
  selectRequest('REQ-109');
}

document.querySelector('[data-theme-toggle]').addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
});

document.getElementById('toggleMarkersBtn').addEventListener('click', () => {
  appState.showMarkers = !appState.showMarkers;
  updateMapLayers();
});

document.getElementById('skillFilter').addEventListener('change', e => {
  appState.skillFilter = e.target.value;
  renderRequests();
  updateMapLayers();
});

document.getElementById('urgencyFilter').addEventListener('change', e => {
  appState.urgencyFilter = e.target.value;
  renderRequests();
  updateMapLayers();
});

document.getElementById('globalSearch').addEventListener('input', e => {
  appState.search = e.target.value.trim().toLowerCase();
  renderRequests();
  updateMapLayers();
});

document.getElementById('resetBtn').addEventListener('click', resetAll);
document.getElementById('simulateBtn').addEventListener('click', simulateNewAlert);
document.getElementById('focusCriticalBtn').addEventListener('click', () => {
  const critical = requests.filter(r => r.urgency >= 5).sort((a, b) => b.peopleNeeded - a.peopleNeeded)[0];
  if (critical) selectRequest(critical.id);
});

updateKPIs();
renderRequests();
renderMatches(null);
initMap();
selectRequest('REQ-101');



/* Chatbot Logic */
const chatState = {
  isOpen: false,
  unreadCount: 0,
  inactivityTimer: null,
  isTyping: false,
  voiceReply: true
};

// Gemini Mode State
let isGeminiMode = false;

const chatElements = {
  window: document.getElementById('chatbotWindow'),
  toggleBtn: document.getElementById('chatToggleBtn'),
  minimizeBtn: document.getElementById('chatMinimizeBtn'),
  closeBtn: document.getElementById('chatCloseBtn'),
  messages: document.getElementById('chatMessages'),
  form: document.getElementById('chatForm'),
  input: document.getElementById('chatInput'),
  sendBtn: document.getElementById('chatSendBtn'),
  badge: document.getElementById('chatBadge'),
  quickActions: document.getElementById('chatQuickActions'),
  voiceMicBtn: document.getElementById('voiceMicBtn'),
  voiceReplyBtn: document.getElementById('voiceReplyBtn'),
  voiceStopBtn: document.getElementById('voiceStopBtn'),
  voiceStatus: document.getElementById('voiceStatus')
};

// Gemini API Function
async function callGeminiAPI(message) {
  const API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your actual API key
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${'API_KEY'}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: message
          }]
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
}

// Web Speech API Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    chatElements.voiceMicBtn.classList.add('active');
    chatElements.voiceStatus.textContent = "Listening...";
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        transcript += event.results[i][0].transcript;
      }
    }
    if (transcript) {
      chatElements.input.value = transcript;
      chatElements.voiceStatus.textContent = "Recognized: " + transcript;
      chatElements.sendBtn.disabled = false;
    }
  };

  recognition.onerror = (event) => {
    let errorMsg = "Mic error: " + event.error;
    if (event.error === 'not-allowed') {
      errorMsg = "Microphone permission denied. Please allow microphone access.";
    } else if (event.error === 'no-speech') {
      errorMsg = "No speech detected. Please try again.";
    } else if (event.error === 'aborted') {
      errorMsg = "Listening stopped.";
    }
    chatElements.voiceStatus.textContent = errorMsg;
    stopListening();
  };

  recognition.onend = () => {
    if (isListening && chatElements.input.value.trim()) {
      handleUserSubmit(new Event('submit'));
    }
    stopListening();
    chatElements.voiceStatus.textContent = "Mic stopped";
  };
} else {
  chatElements.voiceStatus.textContent = "Speech recognition not supported.";
  chatElements.voiceMicBtn.disabled = true;
}

function startListening() {
  if (recognition && !isListening) {
    try {
      chatElements.input.value = '';
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  }
}

function stopListening() {
  if (recognition && isListening) {
    try {
      recognition.stop();
    } catch (e) {
      // Ignore errors when stopping
    }
    isListening = false;
    chatElements.voiceMicBtn.classList.remove('active');
  }
}

// Clean Markdown formatting from text for speech synthesis
function cleanTextForSpeech(text) {
  if (!text) return '';
  
  let cleaned = text;
            cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
            cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
            cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
            cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
            cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
            cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
            cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');
            cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');
            cleaned = cleaned.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '');
            cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
            cleaned = cleaned.replace(/^>\s+/gm, '');
            cleaned = cleaned.replace(/<[^>]+>/g, '');
            cleaned = cleaned.replace(/[ \t]+/g, ' ');
            cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
            cleaned = cleaned.trim();
  return cleaned;
}

function speakText(text) {
  if (!chatState.voiceReply || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  // Clean Markdown formatting before speaking
  const cleanedText = cleanTextForSpeech(text);
  if (!cleanedText) return;
  
  const utterance = new SpeechSynthesisUtterance(cleanedText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
  chatElements.voiceStatus.textContent = "Speaking...";
  utterance.onend = () => {
    chatElements.voiceStatus.textContent = "Voice ready if supported.";
  };
}

function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    chatElements.voiceStatus.textContent = "Voice ready if supported.";
  }
  stopListening();
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playNotificationSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
  osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function resetInactivityTimer() {
  if (chatState.inactivityTimer) clearTimeout(chatState.inactivityTimer);
  if (chatState.isOpen) {
    chatState.inactivityTimer = setTimeout(() => {
      if (chatState.isOpen) setChatState('minimized');
    }, 30000); // 30 seconds
  }
}

function setChatState(state) {
  if (state === 'open') {
    chatElements.window.classList.add('open');
    chatElements.window.classList.remove('minimized');
    chatState.isOpen = true;
    chatState.unreadCount = 0;
    updateBadge();
    chatElements.input.focus();
    resetInactivityTimer();
  } else if (state === 'minimized') {
    chatElements.window.classList.remove('open');
    chatElements.window.classList.add('minimized');
    chatState.isOpen = false;
    if (chatState.inactivityTimer) clearTimeout(chatState.inactivityTimer);
  } else if (state === 'closed') {
    chatElements.window.classList.remove('open', 'minimized');
    chatState.isOpen = false;
    if (chatState.inactivityTimer) clearTimeout(chatState.inactivityTimer);
    // Clear history on close but keep quick actions
    chatElements.messages.innerHTML = `
      <div class="chat-msg bot">Hello! I can guide you through this dashboard by text and voice.</div>
    `;
    chatElements.messages.appendChild(chatElements.quickActions);
  }
}

function updateBadge() {
  if (chatState.unreadCount > 0) {
    chatElements.badge.textContent = chatState.unreadCount;
    chatElements.badge.classList.add('active');
  } else {
    chatElements.badge.classList.remove('active');
  }
}

function scrollToBottom() {
  chatElements.messages.scrollTop = chatElements.messages.scrollHeight;
}

function addMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}`;
  msgDiv.textContent = text;
  chatElements.messages.appendChild(msgDiv);
  scrollToBottom();

  if (sender === 'bot') {
    speakText(text);
    if (!chatState.isOpen) {
      chatState.unreadCount++;
      updateBadge();
      playNotificationSound();
    }
  }
}

function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  chatElements.messages.appendChild(typingDiv);
  scrollToBottom();
}

function hideTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function handleQuickAction(action) {
  addMessage("Tell me about " + action.replace('-', ' '), 'user');
  showTypingIndicator();
  resetInactivityTimer();

  setTimeout(() => {
    hideTypingIndicator();
    let reply = "";
    if (action === 'critical') {
      reply = "I've focused the map on the most critical request.";
      document.getElementById('focusCriticalBtn').click();
    } else if (action === 'volunteer') {
      reply = "The best volunteers are ranked in the right panel when you select a request. They are scored by skill, availability, and distance.";
    } else if (action === 'scoring') {
      reply = "Scoring is: 45% skills, 25% availability, 20% distance, and 10% urgency bonus.";
    } else if (action === 'reset') {
      reply = "I've reset all filters and selections.";
      document.getElementById('resetBtn').click();
    }
    addMessage(reply, 'bot');
  }, 1000);
}

async function handleUserSubmit(e) {
  if (e) e.preventDefault();
  const text = chatElements.input.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  chatElements.input.value = '';
  chatElements.sendBtn.disabled = true;
  resetInactivityTimer();

  showTypingIndicator();

  // Gemini Mode 
  if (isGeminiMode) {
    const geminiResponse = await callGeminiAPI(text);
    hideTypingIndicator();
    
    if (geminiResponse) {
      addMessage(geminiResponse, 'bot');
    } else {
      // Fallback to existing logic if Gemini fails
      addMessage("Gemini unavailable. Switching to basic mode.", 'bot');
      processBasicModeResponse(text);
    }
  } else {
    // Basic Mode - Use existing chatbot logic
    processBasicModeResponse(text);
  }
}

function processBasicModeResponse(text) {
  // Mock AI response (existing logic)
  setTimeout(() => {
    hideTypingIndicator();
    const tLower = text.toLowerCase();
    let reply = "I can help you find volunteers with specific skills or explain the dashboard.";

    if (tLower.includes('critical')) {
      reply = "Let me focus on the critical area for you.";
      document.getElementById('focusCriticalBtn').click();
    } else if (tLower.includes('reset')) {
      reply = "Resetting the dashboard to default state.";
      document.getElementById('resetBtn').click();
    } else if (tLower.includes('score') || tLower.includes('scoring')) {
      reply = "The volunteer matching score combines skills (45%), availability (25%), distance (20%), and urgency (10%).";
    }
    addMessage(reply, 'bot');
  }, 1500 + Math.random() * 1000);
}

// Event Listeners
chatElements.toggleBtn.addEventListener('click', () => {
  if (chatState.isOpen) setChatState('minimized');
  else setChatState('open');
});

chatElements.minimizeBtn.addEventListener('click', () => setChatState('minimized'));
chatElements.closeBtn.addEventListener('click', () => setChatState('closed'));

chatElements.input.addEventListener('input', () => {
  chatElements.sendBtn.disabled = chatElements.input.value.trim() === '';
  resetInactivityTimer();
});

chatElements.form.addEventListener('submit', handleUserSubmit);

// Voice events
chatElements.voiceMicBtn.addEventListener('click', () => {
  if (isListening) stopListening();
  else startListening();
});

chatElements.voiceReplyBtn.addEventListener('click', () => {
  chatState.voiceReply = !chatState.voiceReply;
  chatElements.voiceReplyBtn.classList.toggle('toggle-on', chatState.voiceReply);
  chatElements.voiceStatus.textContent = chatState.voiceReply ? "Voice reply enabled." : "Voice reply disabled.";
  if (!chatState.voiceReply) stopSpeaking();
});

chatElements.voiceStopBtn.addEventListener('click', () => {
  stopSpeaking();
});

// Quick Actions
document.querySelectorAll('.chat-quick-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    handleQuickAction(e.target.dataset.action);
  });
});

// Gemini Mode Toggle
const geminiModeBtn = document.getElementById('geminiModeBtn');
if (geminiModeBtn) {
  geminiModeBtn.addEventListener('click', () => {
    isGeminiMode = !isGeminiMode;
    geminiModeBtn.classList.toggle('gemini-active', isGeminiMode);
    const statusMsg = isGeminiMode ? "Gemini AI mode enabled." : "Basic mode enabled.";
    chatElements.voiceStatus.textContent = statusMsg;
  });
}

updateBadge();