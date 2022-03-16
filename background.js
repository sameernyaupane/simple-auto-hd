chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason == "install") {
    chrome.tabs.create({
        url: 'https://github.com/sameernyaupane/simple-auto-hd'
    });
  } else if (details.reason == "update") {
    var version = chrome.runtime.getManifest().version;
    chrome.tabs.create({
        url: 'https://github.com/sameernyaupane/simple-auto-hd/releases'
    });
  }
});