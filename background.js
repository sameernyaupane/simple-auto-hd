chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason == "install") {
    chrome.tabs.create({
        url: 'https://github.com/sameernyaupane/simple-auto-hd'
    });
  } else if (details.reason == "update") {
    var version = chrome.runtime.getManifest().version;
    chrome.tabs.create({
        url: 'https://github.com/sameernyaupane/simple-auto-hd'
    });
  }
});

chrome.contextMenus.create({
  title: "Search YouTube for \"%s\"",
  contexts: ["selection"],
  onclick: function(info) {
    chrome.tabs.create({
        url: "https://www.youtube.com/results?search_query=" + info.selectionText
    });
  }
});