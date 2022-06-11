import ElementBase from "./lib/element-base.js";

class PodcastMenu extends ElementBase {
  static boundMethods = [
    "toggleMenu",
    "onSelect",
    "onBlur",
    "onScroll",
    "onToggle",
    "showMenu",
    "hideMenu",
  ];

  constructor() {
    super();
    var { modal, menu, menuToggle } = this.elements;
    menuToggle.addEventListener("click", this.onToggle);
    menu
      .querySelectorAll("button")
      .forEach((b) => b.addEventListener("click", this.onSelect));
    menu.addEventListener("blur", this.onBlur);
  }

  onToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    this.toggleMenu();
  }

  showMenu() {
    var { menu, menuToggle } = this.elements;
    menu.removeAttribute("hidden");
    this.onScroll();
    menuToggle.classList.add("open");
    this.dispatch("menu-state", { open: true });
    menu.focus({ preventScroll: true });
    document
      .querySelector("podcast-list")
      .addEventListener("scroll", this.onScroll);
  }

  hideMenu() {
    var { menu, menuToggle } = this.elements;
    menu.toggleAttribute("hidden", true);
    menuToggle.classList.remove("open");
    this.dispatch("menu-state", { open: false });
    document
      .querySelector("podcast-list")
      .removeEventListener("scroll", this.onScroll);
  }

  toggleMenu(hide) {
    if (this.elements.menu.hasAttribute("hidden")) {
      this.showMenu();
    } else {
      this.hideMenu();
    }
  }

  onBlur(e) {
    setTimeout(this.hideMenu, 100);
  }

  onSelect(e) {
    var action = e.target.dataset.action;
    this.hideMenu();
    this.dispatch(`menu-action:${action}`);
  }

  onScroll() {
    var { menu, menuToggle } = this.elements;
    var menuBounds = menu.getBoundingClientRect();
    var container = document.querySelector("podcast-list");
    var origin = menuToggle.getBoundingClientRect().top;
    // is this too high to be extended above?
    if (origin + container.scrollTop < menuBounds.height - 20) {
      menu.classList.remove("upward");
    } else {
      // adjust to scroll
      var containerBounds = container.getBoundingClientRect();
      var up = origin + menuBounds.height > containerBounds.bottom - 20;
      menu.classList.toggle("upward", up);
    }
  }
}

PodcastMenu.define("podcast-menu", "podcast-menu.html");
