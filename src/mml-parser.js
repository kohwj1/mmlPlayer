/**
 * Mabinogi MML Parser
 * Supports commands: T, V, O, L, <, >, &, N, R, CDEFGAB
 */
export class MMLParser {
  constructor() {
    this.defaultLength = 4;
    this.octave = 4;
    this.tempo = 120;
    this.volume = 8; // 0-15
  }

  parse(mmlString) {
    // Remove MML@ and ;
    let cleanMML = mmlString.replace(/^MML@/i, '').replace(/;$/i, '');
    const parts = cleanMML.split(',');

    return parts.map(part => this.parsePart(part));
  }

  parsePart(part) {
    const notes = [];
    let currentPos = 0;
    
    // Reset state for each part
    let currentOctave = 4;
    let currentLength = 4;
    let currentVolume = 8;
    let currentDots = 0;
    let currentTime = 0; // seconds
    let tieNext = false;

    const getNum = () => {
      let numStr = '';
      while (currentPos < part.length && /[0-9]/.test(part[currentPos])) {
        numStr += part[currentPos++];
      }
      return numStr ? parseInt(numStr, 10) : null;
    };

    while (currentPos < part.length) {
      let char = part[currentPos++].toUpperCase();

      switch (char) {
        case 'T':
          const t = getNum();
          if (t !== null) this.tempo = t;
          break;
        case 'V':
          const v = getNum();
          if (v !== null) currentVolume = v;
          break;
        case 'O':
          const o = getNum();
          if (o !== null) currentOctave = o;
          break;
        case '<':
          currentOctave = Math.max(0, currentOctave - 1);
          break;
        case '>':
          currentOctave = Math.min(8, currentOctave + 1);
          break;
        case 'L':
          const l = getNum();
          if (l !== null) currentLength = l;
          currentDots = 0;
          while (currentPos < part.length && part[currentPos] === '.') {
            currentDots++;
            currentPos++;
          }
          break;
        case '&':
          tieNext = true;
          break;
        case 'N':
          const n = getNum();
          if (n !== null) {
            // N is absolute note number. N0 is usually not used, N12 is C1.
            // Mabinogi: N48 is C4.
            const pitch = this.noteNumberToPitch(n);
            const duration = this.calcDuration(currentLength, currentDots);
            
            if (tieNext && notes.length > 0 && notes[notes.length - 1].pitch === pitch && Math.abs(notes[notes.length - 1].time + notes[notes.length - 1].duration - currentTime) < 0.0001) {
              notes[notes.length - 1].duration += duration.seconds;
            } else {
              notes.push({
                time: currentTime,
                pitch: pitch,
                duration: duration.seconds,
                volume: currentVolume / 15
              });
            }
            currentTime += duration.seconds;
            tieNext = false;
          }
          break;
        case 'R':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'A':
        case 'B':
          let pitch = char;
          // Check for accidental
          if (currentPos < part.length && (part[currentPos] === '+' || part[currentPos] === '#' || part[currentPos] === '-')) {
            const acc = part[currentPos++];
            pitch += (acc === '-') ? 'b' : '#';
          }

          // Length
          let len = getNum();
          let dots = 0;
          while (currentPos < part.length && part[currentPos] === '.') {
            dots++;
            currentPos++;
          }

          const duration = this.calcDuration(len || currentLength, dots || (len ? 0 : currentDots));

          // Normalize pitch (b to #) for highlighting consistency
          let normalizedPitch = pitch;
          let normalizedOctave = currentOctave;

          const flatMap = { 'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
          if (flatMap[pitch]) {
            if (pitch === 'Cb') normalizedOctave--;
            normalizedPitch = flatMap[pitch];
          }

          if (char !== 'R') {
            const fullPitch = `${normalizedPitch}${normalizedOctave}`;
            if (tieNext && notes.length > 0 && notes[notes.length - 1].pitch === fullPitch && Math.abs(notes[notes.length - 1].time + notes[notes.length - 1].duration - currentTime) < 0.0001) {
              notes[notes.length - 1].duration += duration.seconds;
            } else {
              notes.push({
                time: currentTime,
                pitch: fullPitch,
                duration: duration.seconds,
                volume: currentVolume / 15
              });
            }
          }
          
          currentTime += duration.seconds;
          tieNext = false;
          break;
      }
    }

    return notes;
  }

  calcDuration(length, dots = 0) {
    // tempo = BPM
    // 4 length = 1 beat (if quarter note is 4)
    // duration in seconds = (60 / tempo) * (4 / length)
    let base = (60 / this.tempo) * (4 / length);
    let total = base;
    let dotValue = base / 2;
    for (let i = 0; i < dots; i++) {
      total += dotValue;
      dotValue /= 2;
    }
    return { seconds: total };
  }

  noteNumberToPitch(n) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(n / 12) - 1;
    const name = names[n % 12];
    return `${name}${octave}`;
  }
}
