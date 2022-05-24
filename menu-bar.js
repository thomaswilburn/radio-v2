import ElementBase from "./lib/element-base.js";
import app from "./app.js";

class MenuBar extends ElementBase {
  
  static boundMethods = [ "onMenu" ]

  constructor() {
    super();
    this.elements.menu.addEventListener("change", this.onMenu);
    this.elements.icon.addEventListener("click", () => app.fire("list-top"));
  }
  
  onMenu() {
    var value = this.elements.menu.value;
    if (!value) return;
    app.fire(value);
    this.elements.menu.selectedIndex = 0;
  }
}

MenuBar.define("menu-bar", "menu-bar.html");
