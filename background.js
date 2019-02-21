chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason == "install") {
    chrome.tabs.create({
        url: 'https://opensourceaddons.com/addons/youtube-auto-hd/?installed'
    });
  } else if (details.reason == "update") {
    var version = chrome.runtime.getManifest().version;
    chrome.tabs.create({
        url: 'https://opensourceaddons.com/addons/youtube-auto-hd/?v=' + version
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