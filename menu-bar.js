import ElementBase from "./element-base.js";
import app from "./app.js";

class MenuBar extends ElementBase {
  constructor() {
    super();
    this.elements.menu.addEventListener("change", this.onMenu);
  }
  
  static get boundMethods() {
    return [
      "onMenu"
    ]
  }
  
  onMenu() {
    var value = this.elements.menu.value;
    if (!value) return;
    app.fire(value);
    this.elements.menu.value = "";
  }
}

MenuBar.define("menu-bar", "menu-bar.html");