import './style.css';
import { MMLParser } from './mml-parser.js';
import { AudioEngine } from './audio-engine.js';

const parser = new MMLParser();
const engine = new AudioEngine();

// UI Elements
const togglePlayBtn = document.getElementById('togglePlayBtn');
const playIcon = document.getElementById('playIcon');
const playText = document.getElementById('playText');
const pasteBtn = document.getElementById('pasteBtn');
const copyBtn = document.getElementById('copyBtn');
const keyboardContainer = document.getElementById('keyboard');
const toastContainer = document.getElementById('toast-container');
const trackInputs = [0, 1, 2, 3, 4, 5].map(i => document.getElementById(`track${i}`));
const charCounts = document.querySelectorAll('.char-count');

// Auto-save logic
const saveToLocalStorage = () => {
  const mmlData = trackInputs.map(input => input.value);
  localStorage.setItem('mml_player_data', JSON.stringify(mmlData));
};

const loadFromLocalStorage = () => {
  try {
    const saved = localStorage.getItem('mml_player_data');
    if (saved) {
      const mmlData = JSON.parse(saved);
      mmlData.forEach((val, i) => {
        if (trackInputs[i]) {
          trackInputs[i].value = val;
          updateCharCount(i);
        }
      });
    }
  } catch (e) {
    console.error('Failed to load saved data:', e);
  }
};

let isPlaying = false;

// Initialize Keyboard
const createKeyboard = () => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const whiteNoteIndices = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
  const blackNoteOffsets = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 }; // C#, D#, F#, G#, A# (relative to white key index in an octave)

  let whiteKeyCount = 0;

  // First pass: create all keys
  for (let oct = 0; oct <= 8; oct++) {
    notes.forEach((note, index) => {
      const isBlack = note.includes('#');
      const key = document.createElement('div');
      key.className = `key ${isBlack ? 'black' : 'white'}`;
      key.dataset.note = `${note}${oct}`;
      key.id = `key-${note.replace('#', 's')}${oct}`;

      if (!isBlack) {
        whiteKeyCount++;
      }
      keyboardContainer.appendChild(key);
    });
  }

  // Second pass: position black keys based on white keys (total 63 white keys for 9 octaves)
  const totalWhiteKeys = whiteKeyCount;
  const whiteKeys = keyboardContainer.querySelectorAll('.key.white');
  const blackKeys = keyboardContainer.querySelectorAll('.key.black');

  blackKeys.forEach(blackKey => {
    const note = blackKey.dataset.note;
    const pitch = note.slice(0, -1);
    const oct = parseInt(note.slice(-1), 10);

    // Find preceding white key index
    let whiteIndex;
    if (pitch === 'C#') whiteIndex = oct * 7 + 1;
    if (pitch === 'D#') whiteIndex = oct * 7 + 2;
    if (pitch === 'F#') whiteIndex = oct * 7 + 4;
    if (pitch === 'G#') whiteIndex = oct * 7 + 5;
    if (pitch === 'A#') whiteIndex = oct * 7 + 6;

    const percent = (whiteIndex / totalWhiteKeys) * 100;
    blackKey.style.left = `${percent}%`;
  });
};

const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
};

// Character Count Update
const updateCharCount = (index) => {
  const count = trackInputs[index].value.length;
  charCounts[index].textContent = `${count} / 2400`;
  if (count > 2400) {
    charCounts[index].classList.add('warning');
  } else {
    charCounts[index].classList.remove('warning');
  }
};

// Event Listeners
trackInputs.forEach((input, i) => {
  input.addEventListener('input', () => {
    updateCharCount(i);
    saveToLocalStorage();
  });
});

const stopPlayback = () => {
  engine.stop();
  document.querySelectorAll('.key.active').forEach(k => k.classList.remove('active'));
  playIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
  playText.textContent = '재생';
  isPlaying = false;
};

togglePlayBtn.addEventListener('click', async () => {
  if (isPlaying) {
    stopPlayback();
  } else {
    await engine.init();
    // Tempo is usually defined in MML (T command), fallback to 120 if not set.
    engine.setTempo(120);

    const allTracks = trackInputs.map(input => {
      let val = input.value.trim().toUpperCase(); // Auto Uppercase
      input.value = val; // Reflect back to UI
      if (!val) return [];
      val = val.replace(/^MML@/i, '').replace(/;$/i, '');
      return parser.parsePart(val);
    });

    engine.play(allTracks);
    playIcon.innerHTML = `<path d="M6 6h12v12H6z"/>`;
    playText.textContent = '정지';
    isPlaying = true;
  }
});

pasteBtn.addEventListener('click', async () => {
  try {
    const text = (await navigator.clipboard.readText()).toUpperCase(); // Auto Uppercase
    const match = text.trim().match(/^MML@(.*);$/i);
    if (match) {
      const parts = match[1].split(',');
      parts.forEach((part, i) => {
        if (trackInputs[i]) {
          trackInputs[i].value = part;
          updateCharCount(i);
        }
      });
      showToast('성공적으로 붙여넣기 되었습니다.');
    } else {
      showToast('유효하지 않은 형식입니다.', 'error');
    }
  } catch (err) {
    showToast('클립보드 접근 권한이 필요합니다.', 'error');
  }
});

copyBtn.addEventListener('click', () => {
  const mml = `MML@${trackInputs.map(i => i.value.trim().toUpperCase()).join(',')};`; // Auto Uppercase
  navigator.clipboard.writeText(mml).then(() => {
    showToast('클립보드에 복사되었습니다!');
  });
});

// Audio Engine Visual Sync
engine.onNoteOn = (pitch, trackIndex) => {
  const noteId = pitch.replace('#', 's');
  const key = document.getElementById(`key-${noteId}`);
  if (key) {
    key.classList.add('active', `track${trackIndex}`);
    key.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
};

engine.onNoteOff = (pitch, trackIndex) => {
  const noteId = pitch.replace('#', 's');
  const key = document.getElementById(`key-${noteId}`);
  if (key) {
    key.classList.remove('active', `track${trackIndex}`);
  }
};

engine.onStop = () => {
  stopPlayback();
};

// Init
createKeyboard();
loadFromLocalStorage();
