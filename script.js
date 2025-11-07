function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
function parseSongs(text) {
  const lines = text.split('\n');
  const songs = [];
  for (let raw of lines) {
    raw = raw.trim();
    if (!raw) continue;
    const parts = raw.split(',').map(p => p.trim().toLowerCase());
    if (parts.length !== 4) continue;
    const [title, cbFlag, pace, durStr] = parts;
    const duration = parseFloat(durStr);
    if (isNaN(duration)) continue;
    const cb = cbFlag === 'cb';
    songs.push({ title, cb, pace, duration });
  }
  return songs;
}

/**
 * Build setlist logic with up to 2 CBs placed early.
 */
function buildSet(songs, setLen, desiredCBs) {
  const cbSongs = songs.filter(s => s.cb);
  const nonCbSongs = songs.filter(s => !s.cb);
  shuffle(cbSongs);
  shuffle(nonCbSongs);

  const numCBs = Math.min(desiredCBs, 2, cbSongs.length);
  const result = [];
  let total = 0;
  let lastPace = null;

  function addSong(song) {
    if (lastPace === 'slow' && song.pace === 'slow') return false;
    result.push(song);
    total += song.duration;
    lastPace = song.pace;
    return true;
  }

  // Start building
  if (numCBs === 1) {
    // Fill first 1–2 with non-CB
    if (nonCbSongs.length) addSong(nonCbSongs.shift());
    const cb = cbSongs.shift();
    if (cb) addSong(cb); // CB second
  } else if (numCBs === 2) {
    // CB1 around 2, CB2 around 4–5
    if (nonCbSongs.length) addSong(nonCbSongs.shift());
    const cb1 = cbSongs.shift();
    if (cb1) addSong(cb1);
    if (nonCbSongs.length) addSong(nonCbSongs.shift());
    const cb2 = cbSongs.shift();
    if (cb2) addSong(cb2);
  }

  // Fill remainder until we hit set length
  while (total < setLen && nonCbSongs.length) {
    const s = nonCbSongs.shift();
    if (!addSong(s)) continue;
  }

  // Trim excess
  while (total > setLen && result.length) {
    const last = result.pop();
    total -= last.duration;
  }

  return result;
}

/* ===== UI Logic ===== */
document.getElementById('generateBtn').addEventListener('click', () => {
  const inputText = document.getElementById('songInput').value;
  const setLen = parseInt(document.getElementById('setLength').value, 10);
  const desiredCBs = Math.min(2, parseInt(document.getElementById('numCBs').value, 10) || 0);

  if (isNaN(setLen) || setLen <= 0) {
    alert('Please enter a valid set length (minutes).');
    return;
  }
  const songs = parseSongs(inputText);
  if (!songs.length) {
    alert('No valid songs were found in the input.');
    return;
  }
  const set = buildSet(songs, setLen, desiredCBs);
  if (!set.length) {
    document.getElementById('output').textContent =
      'Couldn’t build a set that meets all constraints with the supplied songs.';
    return;
  }
  const lines = set.map((s, i) => {
    const cbMark = s.cb ? ' (CB)' : '';
    return `${i + 1}. ${s.title}${cbMark} – ${s.pace} – ${s.duration} min`;
  });
  lines.push(`\nTotal: ${set.reduce((a, s) => a + s.duration, 0)} min`);
  document.getElementById('output').textContent = lines.join('\n');
});

/* ===== Song Adding Logic ===== */
const songInput = document.getElementById('songInput');
document.querySelectorAll('.addBtn').forEach(btn => {
  btn.addEventListener('click', e => {
    const text = e.target.parentElement.textContent.replace('+', '').trim();
    songInput.value += (songInput.value ? '\n' : '') + text;
  });
});
document.getElementById('addAllBtn').addEventListener('click', () => {
  const allSongs = Array.from(document.querySelectorAll('#songList p'))
    .map(p => p.textContent.replace('+', '').trim())
    .join('\n');
  songInput.value = allSongs;
});
document.getElementById('clearAllBtn').addEventListener('click', () => {
  songInput.value = '';
});