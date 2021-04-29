import ElementBase from "./lib/element-base.js";
import app from "./app.js";

class MenuBar extends ElementBase {
  
  static boundMethods = [ "onMenu" ]

  constructor() {
    super();
    this.elements.menu.addEventListener("change", this.onMenu);
  }
  
  onMenu() {
    var value = this.elements.menu.value;
    if (!value) return;
    app.fire(value);
    this.elements.menu.value = "";
  }
}

MenuBar.define("menu-bar", "menu-bar.html");