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

   /* JS for demo only */
  var colors = ['1abc9c', '2c3e50', '2980b9', '7f8c8d', 'f1c40f', 'd35400', '27ae60'];

  var colorPickerElem = document.querySelector('.color-picker');

  colors.forEach(function (color) {
    colorPickerElem.innerHTML +=
     '<div class="square" style="background: #' + color + '"></div>';
  });

  colorPickerElem.addEventListener("click", function(event) {
    var backgroundColor = event.target.style.background;

    changeThemeColor(backgroundColor);

    chrome.storage.sync.set({themeColor: backgroundColor}, function() {});
  });

  function changeThemeColor(backgroundColor) {
    var selectElem = document.querySelector('.custom-dropdown select');
    selectElem.style.background = backgroundColor;

    var switcherNewStyle = document.createElement("style");

    switcherNewStyle.innerHTML =
     '.switcher__indicator::before { background-color: ' + backgroundColor + ' !important;}';

    switcherNewStyle.innerHTML +=
     ' .switcher__indicator::after { background-color: ' + backgroundColor + ' !important;}';

    document.head.appendChild(switcherNewStyle);
  }

  var bodyElem         = document.querySelector('body');
  var backgroundToggle = document.querySelector('.fa-moon');
  var anchor           = document.querySelectorAll('.anchors');

  backgroundToggle.addEventListener("click", function(event) {
    if(bodyElem.style.backgroundColor == 'rgb(255, 255, 255)') {
      setDarkMode();
      chrome.storage.sync.set({darkMode: true}, function() {});
    } else {
      setLightMode();
      chrome.storage.sync.set({darkMode: false}, function() {});
    }
  });

  function setDarkMode() {
    bodyElem.style.backgroundColor = '#37474F';
    bodyElem.style.color = '#fff';
    backgroundToggle.style.color = '#fff';

    anchor.forEach(function(element) {
      element.style.color = '#fff';
    });
  }

  function setLightMode() {
    bodyElem.style.backgroundColor = '#fff';
    bodyElem.style.color = '#000';
    backgroundToggle.style.color = '#000';
    anchor.forEach(function(element) {
      element.style.color = '#0000EE';
    });
  }

  //Set dark mode at runtime
  chrome.storage.sync.get(['darkMode'], function(result) { 
    if(result.darkMode !== undefined) {
      if(result.darkMode) {
        setDarkMode();
      }
    }
  });

  //Set theme mode at runtime
  chrome.storage.sync.get(['themeColor'], function(result) { 
    if(result.themeColor !== undefined) {
      if(result.themeColor) {
        changeThemeColor(result.themeColor);
      }
    }
  });

})();