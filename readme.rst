Radio V2
========

A rewrite of my original Web Component-based podcast player.

* Proxies the RSS through a simple Node server in order to bypass CORS restrictions
* Collection sync via the fetch-key-repeat endpoint
* Player UI designed to be a bit more friendly on small screens
* Wraps IndexedDB in an async wrapper with change events instead of using LocalStorage
* Adds the ability to rename feeds

