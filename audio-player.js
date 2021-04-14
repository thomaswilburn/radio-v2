import ElementBase from "./lib/element-base.js";
import app from "./app.js";
import Table from "./lib/storage.js";

class AudioPlayer extends ElementBase {
  constructor() {
    super();
    this.audio = document.createElement("audio");
    this.audio.setAttribute("preload", "auto");
    this.audio.addEventListener("timeupdate", this.onAudioUpdate);
    this.audio.addEventListener("seeking", this.onAudioUpdate);
    // this.audio.addEventListener("error", this.onAudioError);
    this.audio.addEventListener("loadedmetadata", () => this.classList.add("playable"));
    app.on("play-request", this.onPlayRequest);
    this.elements.play.addEventListener("click", this.onClickPlay);
    this.elements.skip.addEventListener("click", this.onClickSkip);
    this.elements.rewind.addEventListener("click", this.onClickRewind);
    this.elements.stop.addEventListener("click", this.onClickStop);
    this.elements.scrubber.addEventListener("pointerdown", this.onTouchHandle);
    this.elements.scrubber.addEventListener("pointermove", this.onDragHandle);
    this.elements.scrubber.addEventListener("pointerup", this.onReleaseHandle);
    this.dragging = false;
    this.paused = true;
    this.errorState = false;
    this.setEnabled(false);
    this.saveCounter = 0;
    this.memory = new Table("audioplayer");
    this.memory.get("playing").then(track => {
      if (!track) return;
      this.setEnabled(true);
      this.elements.title.innerHTML = track.feed;
      this.elements.episode.innerHTML = track.episode;
      this.audio.src = track.src;
      this.audio.currentTime = track.time;
      this.setMediaSession(track.episode, track.feed, track.artwork, track.credit);
    });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("seekforward", this.onClickSkip);
      navigator.mediaSession.setActionHandler("seekbackward", this.onClickRewind);
    }
  }
  
  static get boundMethods() {
    return [
      "onPlayRequest",
      "onAudioError",
      "onAudioUpdate",
      "onClickPlay",
      "onClickSkip",
      "onClickRewind",
      "onClickStop",
      "onTouchHandle",
      "onDragHandle",
      "onReleaseHandle"
    ]
  }
  
  setEnabled(state) {
    this.classList.toggle("disabled", !state);
  }

  setMediaSession(title, feed, artwork, credit) {
    if ("mediaSession" in navigator) {
      var metadata = {
        title,
        artist: credit,
        album: feed
      };
      if (artwork) {
        metadata.artwork = [{ src: artwork }];
      }
      navigator.mediaSession.metadata = new MediaMetadata(metadata);
    }
  }
  
  onPlayRequest(request) {
    var titleString = request.feed + " - " + request.credit;
    this.elements.title.innerHTML = titleString;
    this.elements.episode.innerHTML = request.title;
    this.audio.src = request.enclosure;
    this.audio.currentTime = 0;
    this.audio.play();
    this.setEnabled(true);
    this.setMediaSession(request.title, request.feed, request.artwork);
    this.memorize({
      episode: request.title,
      feed: request.feed,
      src: request.enclosure,
      artwork: request.artwork,
      credit: request.credit,
      time: 0
    });
  }
  
  onAudioUpdate(e) {
    if (this.classList.contains("disabled")) return;
    if (e.type == "seeking") {
      this.elements.play.dataset.state = "seeking";
    } else {
      this.elements.play.dataset.state = this.audio.paused ? "paused" : "playing";
    }
    
    var audio = this.audio;
    this.updateTime();

    app.fire("track-update", audio.src);

    if (audio.src && !audio.paused) {
      this.errorState = false;
      if (this.saveCounter % 10 == 0) {
        this.memorize({
          time: audio.currentTime,
          duration: audio.duration
        });
      }
      this.saveCounter++;
    }
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

  async memorize(update) {
    if (!update) {
      return this.memory.delete("playing");
    }
    var playing = await this.memory.get("playing");
    if (!update.audio) {
      update = Object.assign({}, playing, update);
    }
    if ("duration" in update && !update.duration) {
      return;
    }
    await this.memory.set("playing", update);
  }
  
  updateTime(time = this.audio.currentTime, duration = this.audio.duration) {
    var ratio = duration ? time / duration : 0;
    this.elements.progress.style.width = ratio * 100 + "%";
    
    this.elements.current.innerHTML = this.formatTime(time);
    this.elements.duration.innerHTML = this.formatTime(duration);
  }
  
  onAudioError(e) {
    console.log(e);
    if (this.errorState) return;
    this.errorState = true;
    // get last valid location
    var i = this.audio.played.length - 1;
    var played = this.audio.played.end(i);
    var memory = this.memory.get("playing");
    if (!memory) return;
    var { time } = memory;
    var src = this.audio.src;
    this.audio.src = src;
    this.audio.currentTime = time;
    this.audio.play();
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
  
  onClickRewind() {
    this.audio.currentTime -= 10;
  }

  async onClickStop() {
    this.setEnabled(false);
    await this.audio.pause();
    this.audio.src = "";
    this.audio.removeAttribute("src");
    this.elements.title.innerHTML = "";
    this.updateTime(0, 0);
    this.classList.remove("playable");
    app.fire("track-update", null);
    this.memory.delete("playing");
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
    this.updateTime(time);
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
