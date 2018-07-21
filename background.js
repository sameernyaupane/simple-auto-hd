chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == "install") {
        chrome.management.getSelf(function(info) {
            var ext_name = encodeURIComponent(info.name);
            chrome.tabs.create({
                url: 'https://sameernyaupane.com/youtube-auto-hd'
            });
        });
    }
});