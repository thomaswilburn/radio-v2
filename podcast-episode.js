import ElementBase from "./lib/element-base.js";
import app from "./app.js";

class PodcastEpisode extends ElementBase {
  constructor() {
    super();
    this.elements.expandButton.addEventListener("click", this.onExpand);
    this.elements.playButton.addEventListener("click", this.onClickPlay);
    app.on("track-update", url => {
      this.classList.toggle("playing", url == this.dataset.key);
    });
  }
  
  static get boundMethods() {
    return [
      "onExpand",
      "onClickPlay"
    ]
  }
  
  onExpand() {
    this.classList.toggle("expanded");
    this.elements.expandButton.setAttribute("aria-pressed", this.classList.contains("expanded"));
  }
  
  onClickPlay() {
    var url = this.dataset.key;
    this.dispatch("episode-play", { url });
  }
}

PodcastEpisode.define("podcast-episode", "podcast-episode.html");