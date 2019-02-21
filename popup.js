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
  
  /*setTimeout(function() { 
    var addedStyle = document.createElement("style");
    addedStyle.innerHTML =
     '.switcher__indicator::after { transition: all .3s ease}';

    document.head.appendChild(addedStyle);
  }, 5);*/

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
    var background = event.target.style.background;

    var selectElem = document.querySelector('.custom-dropdown select');
    selectElem.style.background = background;

    var switcherNewStyle = document.createElement("style");

    switcherNewStyle.innerHTML =
     '.switcher__indicator::before { background-color: ' + background + ' !important;}';

    switcherNewStyle.innerHTML +=
     ' .switcher__indicator::after { background-color: ' + background + ' !important;}';

    document.head.appendChild(switcherNewStyle);
  });

  var bodyElem         = document.querySelector('body');
  var backgroundToggle = document.querySelector('.fa-moon');
  var anchor           = document.querySelectorAll('.anchors');

  //Set theme mode at runtime
  chrome.storage.sync.get(['darkMode'], function(result) { 
    if(result.darkMode !== undefined) {
      if(result.darkMode) {
        setDarkMode();
      }
    }
  });

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
})();