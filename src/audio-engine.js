import * as Tone from 'tone';

export class AudioEngine {
  constructor() {
    this.sampler = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3"
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/"
    }).toDestination();

    this.parts = [];
    this.onNoteOn = null; // Callback for keyboard highlight
    this.onNoteOff = null;
    this.onStop = null; // Callback for when playback ends
  }

  async init() {
    await Tone.start();
    console.log("Audio Context Started");
  }

  play(tracks) {
    this.stop();

    tracks.forEach((notes, index) => {
      const part = new Tone.Part((time, event) => {
        this.sampler.triggerAttackRelease(event.pitch, event.duration, time, event.volume);
        
        // Sync UI (Keyboard highlight) with track info
        Tone.Draw.schedule(() => {
          if (this.onNoteOn) this.onNoteOn(event.pitch, index);
        }, time);

        Tone.Draw.schedule(() => {
          if (this.onNoteOff) this.onNoteOff(event.pitch, index);
        }, time + event.duration);

      }, notes).start(0);
      
      this.parts.push(part);
    });

    // Schedule onStop at the end of the longest track
    const durations = tracks.map(notes => 
      notes.length > 0 ? (notes[notes.length - 1].time + notes[notes.length - 1].duration) : 0
    );
    const maxDuration = Math.max(0, ...durations);

    Tone.Transport.schedule((time) => {
      Tone.Draw.schedule(() => {
        if (this.onStop) this.onStop();
      }, time);
    }, maxDuration);

    Tone.Transport.start();
  }

  stop() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    this.parts.forEach(part => part.dispose());
    this.parts = [];
  }

  setTempo(bpm) {
    Tone.Transport.bpm.value = bpm;
  }
}
