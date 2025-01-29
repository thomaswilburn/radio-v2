import ElementBase from "./lib/element-base.js";
import app from "./app.js";
import Table from "./lib/storage.js";

var tick = () => new Promise(ok => requestAnimationFrame(ok));

class AudioPlayer extends ElementBase {

  static boundMethods = [
    "onPlayRequest",
    "onAudioError",
    "onAudioUpdate",
    "onClickPlay",
    "onClickSkip",
    "onClickRewind",
    "onClickStop",
    "onTouchHandle",
    "onDragHandle",
    "onReleaseHandle",
    "onReloadPlayer"
  ];

  paused = false;
  dragging = false;
  backoff = 0;
  recovery = null;
  saveCounter = 0;

  constructor() {
    super();
    this.audio = document.createElement("audio");
    this.audio.setAttribute("preload", "auto");
    this.audio.addEventListener("timeupdate", this.onAudioUpdate);
    this.audio.addEventListener("seeking", this.onAudioUpdate);
    this.audio.addEventListener("error", this.onAudioError);
    this.audio.addEventListener("stalled", this.onAudioError);
    this.audio.addEventListener("loadedmetadata", () => this.classList.add("playable"));
    app.on("play-request", this.onPlayRequest);
    app.on("player-reload", this.onReloadPlayer);
    this.elements.play.addEventListener("click", this.onClickPlay);
    this.elements.skip.addEventListener("click", this.onClickSkip);
    this.elements.rewind.addEventListener("click", this.onClickRewind);
    this.elements.stop.addEventListener("click", this.onClickStop);
    this.elements.scrubber.addEventListener("pointerdown", this.onTouchHandle);
    this.elements.scrubber.addEventListener("pointermove", this.onDragHandle);
    this.elements.scrubber.addEventListener("pointerup", this.onReleaseHandle);
    this.setEnabled(false);
    this.memory = new Table("audioplayer");
    this.memory.get("playing").then(track => {
      if (!track) return;
      this.setEnabled(true);
      this.setMetadataDisplay(track);
      this.audio.src = track.src;
      this.audio.currentTime = track.time;
    });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("seekforward", this.onClickSkip);
      navigator.mediaSession.setActionHandler("seekbackward", this.onClickRewind);
    }
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

  setMetadataDisplay(podcast) {
    var titleString = podcast.feed + " - " + podcast.credit;
    this.elements.title.innerHTML = titleString;
    this.elements.episode.innerHTML = podcast.title;
    this.elements.artwork.src = "";
    this.elements.artwork.src = podcast.artwork;
    this.setMediaSession(podcast.title, podcast.feed, podcast.artwork, podcast.credit);
  }
  
  onPlayRequest(request) {
    this.setMetadataDisplay(request);
    this.audio.src = request.enclosure;
    this.audio.currentTime = 0;
    this.audio.play();
    this.setEnabled(true);
    this.memorize({
      title: request.title,
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
      if (this.recovery) {
        clearTimeout(this.recovery);
        this.recovery = null;
      }
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

  onAudioError(e) {
    var { error } = this.audio;
    if (error.code == MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return;
    console.log(this.audio.error);
    if (this.recovery) return;
    // reboot the audio stream
    this.recovery = setTimeout(this.onReloadPlayer, Math.pow(10, this.backoff++));
  }
  
  async onReloadPlayer() {
    var paused = this.audio.paused;
    this.audio.pause();
    var src = this.audio.src;
    var time = this.audio.currentTime;
    this.audio.src = "";
    clearTimeout(this.recovery);
    this.recovery = null;
    await tick();
    this.audio.src = src;
    this.audio.addEventListener("canplay", () => {
      this.backoff = 0;
      this.audio.currentTime = time;
      if (!paused) {
        this.audio.play();
      }
    }, { once: true });
  }
  
}

AudioPlayer.define("audio-player", "audio-player.html");
