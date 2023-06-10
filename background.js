chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason == "install") {
    chrome.tabs.create({
        url: 'https://sameernyaupane.github.io/simple-auto-hd/installation'
    });
  } else if (details.reason == "update") {
    var version = chrome.runtime.getManifest().version;
    chrome.tabs.create({
        url: 'https://sameernyaupane.github.io/simple-auto-hd/updated?v=2.0.4'
    });
  }
});