import ElementBase from "./lib/element-base.js";

class PodcastMenu extends ElementBase {

  static boundMethods = ["onIntersection", "toggleMenu", "onSelect", "onBlur"];

  constructor() {
    super();
    var { modal, menu, menuToggle } = this.elements;
    modal.addEventListener("click", () => this.toggleMenu(true));
    menuToggle.addEventListener("click", e => this.toggleMenu());
    menu.querySelectorAll("button").forEach(b => b.addEventListener("click", this.onSelect));
    menu.addEventListener("blur", this.onBlur);

    this.observer = new IntersectionObserver(this.onIntersection, {
      threshold: 1
    });
    this.observer.observe(menu);
  }

  toggleMenu(hide) {
    var { modal, menu, menuToggle } = this.elements;
    // modal.toggleAttribute("hidden");
    var hidden = menu.toggleAttribute("hidden", hide);
    menuToggle.classList.toggle("open", !hidden);
    this.dispatch("menu-state", { open: !hidden });
    if (!hidden) {
      menu.focus();
      var bounds = this.getBoundingClientRect();
      if (bounds.top > window.innerHeight * .3) {
        menu.classList.add("upward");
      }
      menu.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      menu.blur();
      menu.classList.remove("upward");
    }
  }

  onBlur() {
    setTimeout(() => this.toggleMenu(true), 100);
  }

  onIntersection([entry]) {
    if (!entry.isIntersecting) {
      var overflowBottom = entry.boundingClientRect.bottom > window.innerHeight;
      this.elements.menu.classList.toggle("upward", overflowBottom);
    }
  }

  onSelect(e) {
    var action = e.target.dataset.action;
    this.toggleMenu(true);
    this.dispatch(`menu-action:${action}`);
    console.log(action);
  }

}

PodcastMenu.define("podcast-menu", "podcast-menu.html");