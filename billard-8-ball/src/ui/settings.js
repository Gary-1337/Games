// @ts-check
// Einstellungen und Spielstand in localStorage (robust gegen gesperrten Speicher).

const SETTINGS_KEY = 'billard8.settings.v1';
const SAVE_KEY = 'billard8.save.v1';

export const DEFAULT_SETTINGS = {
  aimAssist: /** @type {'off'|'short'|'medium'|'long'} */ ('medium'),
  cuePreview: true,
  cameraFollow: true,
  sound: true,
  volume: 0.8,
  music: true,
  musicVolume: 0.225,
  haptics: true,
  colorblind: false,
  leftHanded: false,
  quality: /** @type {'auto'|'low'|'medium'|'high'} */ ('auto'),
  miscue: false,
  undo2p: true,
  fastForward: false,
  hideTurn: true,
  tutorialDone: false,
  names: ['Spieler 1', 'Spieler 2'],
  difficulty: /** @type {'easy'|'medium'|'hard'} */ ('medium'),
  casual: false,
  railRule: true,
};
/** @typedef {typeof DEFAULT_SETTINGS} Settings */

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Speicher nicht verfügbar (privater Modus) – Spiel läuft trotzdem */
  }
}

/** @returns {Settings} */
export function loadSettings() {
  const s = read(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {}) };
}

/** @param {Settings} s */
export function saveSettings(s) { write(SETTINGS_KEY, s); }

export function loadGame() { return read(SAVE_KEY); }
export function saveGame(data) { write(SAVE_KEY, data); }
export function clearGame() { write(SAVE_KEY, null); }
