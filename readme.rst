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

How this works
--------------

By default, the app is run from Express (via ``server.js`` that proxies requests for remote feed XML, since many podcasts are not published with an Access-Control-Allow-Origin header. Otherwise, the client-side code is entirely static files and doesn't technically require an actual server for hosting.

Application UI and rendering logic is built via custom elements, all of which extend ``lib/element-base.js``. This base class provides the ability to automatically bind methods, mirror properties, and populate/access the element's shadow root. Templates for each element are loaded by the static ``define`` method from a separate HTML file. Since this process is async (using ``fetch()``), modules that access custom element properties and methods use ``customElements.whenDefined()`` to ensure that their dependencies are ready first.

The main components on the page, loaded from an inline module, are:

* ``menu-bar`` - provides the top menu bar on the page
* ``podcast-list`` - creates a ``podcast-feed`` element for each subscription, which then pulls and displays the feed items
* ``audio-player``

Separate from the individual elements, shared state is accessed via the singleton instance in ``app.js``. The primary state is the list of feeds, which is stored in an IndexedDB table, wrapped via the class in ``lib/storage.js``. Components can subscribe to that list to be notified on change for re-rendering. The app object also acts as an event bus for communicating between UI components. For example, ``podcast-feed`` elements dispatch a event through the app instance when the user clicks play, which the ``audio-player`` listens for.

In cases where components need to render a data-backed list (such as the list of feeds, or list of items within a feed), they use the ``matchData()`` utility function from ``lib/common.js``. This function takes four arguments: the container element for the list, an array of data to sync with the DOM, the property name that's used to track data objects (defaults to "key"), and the tag name or factory function used to create missing elements (defaults to "div"). ``matchData()`` returns an array of data/child pairs for any follow-up processing.

You can sync subscriptions between clients using an echo server like `this one <https://glitch.come/~fetch-key-repeat>`_. Choosing "sync export" on the first client will upload feed URLs and display a code word, which you can provide on the second client to grab that data from the server. This sync is one-time only.
