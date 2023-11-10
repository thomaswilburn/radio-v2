import ElementBase from "./lib/element-base.js";
import app from "./app.js";

class PodcastEpisode extends ElementBase {
  
  static boundMethods = [
    "onExpand",
    "onClickPlay",
    "onTrackUpdate"
  ]

  constructor() {
    super();
    this.elements.playButton.addEventListener("click", this.onClickPlay);
    this.elements.title.addEventListener("click", this.onExpand);
  }

  connectedCallback() {
    app.on("track-update", this.onTrackUpdate);
  }

  disconnectedCallback() {
    app.off("track-update", this.onTrackUpdate);
  }

  onTrackUpdate(url) {
    this.classList.toggle("playing", url == this.dataset.key);
  }

  onExpand() {
    var expanded = this.classList.toggle("expanded");
    if (expanded) {
      this.elements.description.focus({ preventScroll: true });
    }
  }
  
  onClickPlay() {
    var url = this.dataset.key;
    this.dispatch("episode-play", { url });
  }

  set episodeData(data) {
    this.elements.title.innerHTML = data.title.trim();
    this.elements.description.innerHTML = data.description.replace(/\n+/g, "<br><br>");
    this.elements.download.href = data.enclosure || "";
    var mp3 = new URL(data.enclosure);
    this.elements.download.setAttribute("download", mp3.pathname.split("/").pop());
    if (data.link) this.elements.link.href = data.link;
  }
}

PodcastEpisode.define("podcast-episode", "podcast-episode.html");
