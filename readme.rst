Radio V2
========

A rewrite of my original Web Component-based podcast player.

Features
--------

* Proxies the RSS through a simple Node server in order to bypass CORS restrictions
* Collection sync via the fetch-key-repeat endpoint
* Player UI designed to be a bit more finger-friendly on small screens
* Wraps IndexedDB in an async wrapper with change events instead of using LocalStorage
* Adds the ability to rename feeds

Pending
-------

* Tracking "heard" status by item, instead of for the entire feed
* Reordering feeds manually
* Player "memory" (for unexpected tab crashes/restarts)