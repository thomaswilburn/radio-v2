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
    this.elements.expandButton.addEventListener("click", this.onExpand);
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
    this.elements.expandButton.setAttribute("aria-pressed", this.classList.contains("expanded"));
    if (expanded) {
      this.elements.description.focus({ preventScroll: true });
    }
  }
  
  onClickPlay() {
    var url = this.dataset.key;
    this.dispatch("episode-play", { url });
  }
}

PodcastEpisode.define("podcast-episode", "podcast-episode.html");
