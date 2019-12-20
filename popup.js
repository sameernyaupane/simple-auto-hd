(function() {
  var version = chrome.runtime.getManifest().version; 
  var theaterModeElement = document.getElementById('theater-mode');
  var preferredQualityElement = document.getElementById('preferred-quality');

  var headerElem = document.querySelector('header');
  headerElem.innerHTML += 'v' + version;

  chrome.storage.sync.get(['preferredQuality'], function(result) { 
    if(result.preferredQuality !== undefined) {
      preferredQualityElement.value = result.preferredQuality;
    }
  });

  chrome.storage.sync.get(['theaterMode'], function(result) { 
    if(result.theaterMode !== undefined) {
      theaterModeElement.checked = result.theaterMode; 
    }
  });

  preferredQualityElement.onchange = function() {
    var selectedString = preferredQualityElement.options[preferredQualityElement.selectedIndex].value;

    chrome.storage.sync.set({preferredQuality: selectedString}, function() {});
  }

  theaterModeElement.addEventListener('change', function(event) {
    if (event.target.checked) {
      setTheaterModeBoolean(true);
    } else {
      setTheaterModeBoolean(false);
    }
  });

  var setTheaterModeBoolean = function(theaterMode) {
    chrome.storage.sync.set({theaterMode: theaterMode}, function() {});
  }
})();