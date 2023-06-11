(function() {
    var version                 = chrome.runtime.getManifest().version;
    var theaterModeElement      = document.getElementById('theater-mode');
    var extensionStatusElement  = document.getElementById('extension-status');
    var extensionEnabledElement = document.getElementById('extension-enabled');
    var preferredQualityElement = document.getElementById('preferred-quality');
    var wrapperElement          = document.getElementsByClassName('wrapper')[0];

    var headerElem = document.querySelector('header .version');
    headerElem.innerText = 'v' + version;

    function disableElements() {
        wrapperElement.classList.add('wrapper-enabled');
        document.body.style.backgroundColor = 'grey';
        extensionStatusElement.innerText = 'Extension Disabled';
    }

    function enableElements() {
        wrapperElement.classList.remove('wrapper-enabled');
        document.body.style.backgroundColor = '#262a32';
        extensionStatusElement.innerText = 'Extension Enabled';
    }

    chrome.storage.sync.get(['extensionEnabled'], function(result) { 
        if(result.extensionEnabled !== undefined && result.extensionEnabled === false) {
            extensionEnabledElement.checked = false; 
            disableElements();
        } else {
            enableElements();
            extensionEnabledElement.checked = true;
        }
    });

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

    extensionEnabledElement.addEventListener('change', function(event) {
        if (event.target.checked) {
            setExtensionEnabledBoolean(true);
            enableElements();
        } else {
            setExtensionEnabledBoolean(false);
            disableElements();
        }
    });

    var setTheaterModeBoolean = function(theaterMode) {
        chrome.storage.sync.set({theaterMode: theaterMode}, function() {});
    }

    var setExtensionEnabledBoolean = function(extensionEnabled) {
        chrome.storage.sync.set({extensionEnabled: extensionEnabled}, function() {});
    }
})();