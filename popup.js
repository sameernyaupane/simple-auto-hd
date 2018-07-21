(function() {  
  var preferredQualityElement = document.getElementById('preferred-quality');
  var theaterModeElement = document.getElementById('theater-mode');

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
  
  setTimeout(function() { 
    var addedStyle = document.createElement("style");
    addedStyle.innerHTML =
     '.switcher__indicator::after { transition: all .3s ease}';

    document.head.appendChild(addedStyle);
  }, 5);

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