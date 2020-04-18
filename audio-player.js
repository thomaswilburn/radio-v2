import ElementBase from "./lib/element-base.js";
import app from "./app.js";

class AudioPlayer extends ElementBase {
  constructor() {
    super();
    this.audio = document.createElement("audio");
    this.audio.addEventListener("timeupdate", this.onAudioUpdate);
    this.audio.addEventListener("seeking", this.onAudioUpdate);
    this.audio.addEventListener("error", this.onAudioError);
    this.audio.addEventListener("canplay", () => this.classList.add("playable"));
    app.on("play-request", this.onPlayRequest);
    this.elements.play.addEventListener("click", this.onClickPlay);
    this.elements.skip.addEventListener("click", this.onClickSkip);
    this.elements.stop.addEventListener("click", this.onClickStop);
    this.elements.scrubber.addEventListener("pointerdown", this.onTouchHandle);
    this.elements.scrubber.addEventListener("pointermove", this.onDragHandle);
    this.elements.scrubber.addEventListener("pointerup", this.onReleaseHandle);
    this.dragging = false;
    this.paused = true;
    this.memory = null;
    this.setEnabled(false);
  }
  
  static get boundMethods() {
    return [
      "onPlayRequest",
      "onAudioError",
      "onAudioUpdate",
      "onClickPlay",
      "onClickSkip",
      "onClickStop",
      "onTouchHandle",
      "onDragHandle",
      "onReleaseHandle"
    ]
  }
  
  setEnabled(state) {
    this.classList.toggle("disabled", !state);
  }
  
  onPlayRequest(request) {
    this.elements.title.innerHTML = request.feed + " - " + request.title;
    this.audio.src = request.enclosure;
    this.audio.play();
  }
  
  onAudioUpdate(e) {
    this.setEnabled(true);
    if (e.type == "seeking") {
      this.elements.play.dataset.state = "seeking";
    } else {
      this.elements.play.dataset.state = this.audio.paused ? "paused" : "playing";
    }
    
    var audio = this.audio;
    var time = audio.currentTime;
    var duration = audio.duration;
    
    var ratio = time / duration;
    this.elements.progress.style.width = ratio * 100 + "%";
    
    this.elements.current.innerHTML = this.formatTime(time);
    this.elements.duration.innerHTML = this.formatTime(duration);

    app.fire("track-update", this.audio.src);
  }

  formatTime(t) {
    var hours = (t / (60 * 60)) | 0;
    t -= hours * 60 * 60;
    var minutes = (t / 60) | 0;
    t -= minutes * 60;
    t = t | 0;
    return [
      hours,
      (minutes + "").padStart(2, "0"),
      (t + "").padStart(2, "0")
    ].join(":");
  }
  
  onAudioError() {
    
  }
  
  onClickPlay() {
    if (this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  }
  
  onClickSkip() {
    this.audio.currentTime += 10;
  }

  async onClickStop() {
    await this.audio.pause();
    await new Promise(ok => requestAnimationFrame(ok));
    this.setEnabled(false);
    this.elements.title.innerHTML = "";
    this.elements.current.innerHTML = this.formatTime(0);
    this.elements.duration.innerHTML = this.formatTime(0);
    this.classList.remove("playable");
    app.fire("track-update", null);
  }
  
  onTouchHandle(e) {
    this.dragging = true;
    this.paused = this.audio.paused;
    this.audio.pause();
    this.elements.scrubber.setPointerCapture(e.pointerId);
  }
  
  onDragHandle(e) {
    if (!this.dragging) return;
    var x = e.offsetX;
    var d = x / this.elements.scrubber.offsetWidth;
    var duration = this.audio.duration;
    if (d < 0) d = 0;
    if (d > 1) d = 1;
    var time = duration * d;
    this.elements.progress.style.width = (d * 100) + "%";
    this.elements.current.innerHTML = this.formatTime(time);
  }
  
  onReleaseHandle(e) {
    this.dragging = false;
    var x = e.offsetX;
    var d = x / this.elements.scrubber.offsetWidth;
    if (d < 0) d = 0;
    if (d > 1) d = 1;
    this.audio.currentTime = this.audio.duration * d;
    if (!this.paused) {
      this.audio.play();
    }
  }
  
}

AudioPlayer.define("audio-player", "audio-player.html");