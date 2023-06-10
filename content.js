(function() {
    // Configuration of the observer
    var config = {
        childList    : true,
        attributes   : true,
        subtree      : true,
        characterData: true
    };

    function initiateObserverAndObserve() {
        var observer = new MutationObserver(function(mutations) {
                if (!document.contains(document.querySelector('.ytp-settings-button'))) {
                    return;
                }

                observer.disconnect();

                // Run code
                toggleTheaterMode();
                selectPreferredQuality();
        });

        observer.observe(document.body, config);
    }

    document.addEventListener('yt-navigate-finish', function(event) {
        if(location.pathname === '/watch') {
            initiateObserverAndObserve();
        }
    });

    var toggleTheaterMode = function() {
        chrome.storage.sync.get(['theaterMode'], function(result) { 
            updateTheaterMode(result.theaterMode); 
        });

        var updateTheaterMode = function(theaterMode) {
            var theaterModeTitles = [
                'Teatermodus (t)',
                'Teatr rejimi (t)',
                'Tampilan bioskop (t)',
                'Mod teater (t)',
                'Način rada za kino (t)',
                'Mode Cinema (t)',
                'Režim kina (t)',
                'Biograftilstand (t)',
                'Kinomodus (t)',
                'Kinorežiim (t)',
                'Cinema mode (t)',
                'Theater mode (t)',
                'Modo Cine (t)',
                'Modo cine (t)',
                'Antzoki modua (t)',
                'Mode cinéma (t)',
                'Kinematografski način rada (t)',
                'Imodi yethiyetha (t)',
                'Kvikmyndahúsastilling (t)',
                'Hali ya ukumbi wa filamu (t)',
                'Teātra režīms (t)',
                'Kino režimas (t)',
                'Mozi mód (t)',
                'Theatermodus (t)',
                'Modo cinema (t)',
                'Modo Teatro (t)',
                'Modul Cinema (t)',
                'Modaliteti i kinemasë (t)',
                'Način kina (t)',
                'Bioskopski režim (t)',
                'Teatteritila (t)',
                'Bioläge (t)',
                'Chế độ rạp chiếu phim (t)',
                'Sinema modu (t)',
                'Рэжым тэатра (t)',
                'Театр режими (t)',
                'Режим на кино сала (t)',
                'Широкий экран (t)',
                'Режим домашнього кінотеатру (t)',
                'Λειτουργία κινηματογράφου (t)',
                'Լայն էկրան (t)',
                'מצב קולנוע (t)',
                'تھیٹر وضع (t)',
                'وضع المسرح (t)',
                'حالت نمایش (t)',
                'थिएटर मोड (t)',
                'থিয়েটাৰ ম’ড (t)',
                'সিনেমা হল মোড (t)',
                'ਥੀਏਟਰ ਮੋਡ (t)',
                'થિયેટર મોડ (t)',
                'ଥିଏଟର୍‌ ମୋଡ୍‌ (t)',
                'அரங்கு பயன்முறை (t)',
                'థియేటర్ మోడ్ (t)',
                'ಥಿಯೇಟರ್ ಮೋಡ್ (t)',
                'തീയേറ്റർ മോഡ് (t)',
                'රඟහල ප්‍රකාරය (t)',
                'โหมดโรงภาพยนตร์ (t)',
                'ຮູບແບບໂຮງລະຄອນ (t)',
                'ရုပ်ရှင်ရုံ အနေအထား (t)',
                'თეატრალური რეჟიმი (t)',
                'ቲያትር ሁነታ (t)',
                'របៀប​រោងភាពយន្ត (t)',
                '剧场模式 (t)',
                '劇院模式 (t)',
                'シアター モード（t）',
                '영화관 모드(t)'
            ];

            if (theaterMode === undefined) {
                chrome.storage.sync.set({theaterMode: false}, function() {});
            }

            var sizeButton = document.getElementsByClassName('ytp-size-button')[0];
            var sizeButtonHasTheaterModeTitle = theaterModeTitles.includes(sizeButton.getAttribute('title'));

            if(theaterMode && sizeButtonHasTheaterModeTitle) {
                sizeButton.click();
            } else if(!theaterMode && !sizeButtonHasTheaterModeTitle) {
                sizeButton.click();
            }
        }
    };

    var selectPreferredQuality = function() { 
        var preferredQuality;
        var qualitiesArray = [
            '4320p', 
            '4320p60', 
            '4320p50', 
            '4320p48', 
            '2160p', 
            '2160p60', 
            '2160p50', 
            '2160p48', 
            '1440p',
            '1440p60',
            '1440p50',
            '1440p48',
            '1080p',
            '1080p60',
            '1080p50',
            '1080p48',
            '720p',
            '720p60',
            '720p50',
            '720p48',
            '480p',
            '360p',
            '240p',
            '144p',
            'Auto'
        ];

        var qualityTitles = [
            'Gehalte',
            'Keyfiyyət',
            'Kualitas',
            'Kualiti',
            'Kvalitet',
            'Qualitat',
            'Kvalita',
            'Qualität',
            'Kvaliteet',
            'Quality',
            'Calidad',
            'Kalitatea',
            'Kalidad',
            'Qualité',
            'Calidade',
            'Kvaliteta',
            'Ikhwalithi',
            'Gæði',
            'Ubora',
            'Kvalitāte',
            'Kokybė',
            'Minőség',
            'Kwaliteit',
            'Sifati',
            'Qualidade',
            'Calitate',
            'Cilësia',
            'Kakovost',
            'Laatu',
            'Chất lượng',
            'Kalite',
            'Якасць',
            'Сапаты',
            'Квалитет',
            'Качество',
            'Якість',
            'Ποιότητα',
            'Որակ',
            'איכות',
            'معیار',
            'الجودة',
            'کیفیت',
            'गुण',
            'गुणवत्ता',
            'क्वालिटी',
            'গুণাগুণ',
            'গুণমান',
            'ਗੁਣਵੱਤਾ',
            'ક્વૉલિટી',
            'ଗୁଣବତ୍ତା',
            'தரம்',
            'క్వాలిటీ',
            'ಗುಣಮಟ್ಟ',
            'നിലവാരം',
            'ගුණත්වය',
            'คุณภาพ',
            'ຄຸນນະພາບ',
            'အရည်အသွေး',
            'ხარისხი',
            'ጥራት',
            'គុណភាព​',
            '画质',
            '畫質',
            '画質',
            '화질'
        ];

        chrome.storage.sync.get(['preferredQuality'], function(result) {
            updateQuality(result.preferredQuality); 
        });

        var updateQuality = function(preferredQuality) {
            if (preferredQuality === undefined) {
                preferredQuality = 'best-available';
                chrome.storage.sync.set({preferredQuality: preferredQuality}, function() {});
            }

            var settingsButton = document.getElementsByClassName('ytp-settings-button')[0];

            settingsButton.click();

            var buttons = document.getElementsByClassName('ytp-menuitem-label');

            for (var i = 0; i < buttons.length; i++) {
                if(qualityTitles.includes(buttons[i].innerHTML)) {
                    buttons[i].click();
                }
            }

            var targetItem;

            if(preferredQuality === 'best-available') {
                targetItem = document.querySelector('.ytp-quality-menu .ytp-menuitem-label');
            } else {
                var targetItems = document.querySelectorAll('.ytp-quality-menu .ytp-menuitem-label');

                var loopCounter = 0;

                function findTargetItem() {
                    for (var i = 0; i < targetItems.length; i++) {
                        var potentialTargetItem = targetItems[i].childNodes[0].childNodes[0];

                        var quality = potentialTargetItem.innerHTML.split(' ')[0];

                        if(quality === preferredQuality) {
                            targetItem = potentialTargetItem;
                        }
                    }

                    if(targetItem === undefined && loopCounter < 10) {
                        var key = qualitiesArray.indexOf(preferredQuality);
                        preferredQuality = qualitiesArray[key + 1];

                        loopCounter++;

                        return findTargetItem();
                    }

                    return targetItem;
                }

                targetItem = findTargetItem();
            }

            targetItem.click();
        }
    };

    chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (key in changes) {
            if(key === 'theaterMode') {
                toggleTheaterMode();
            } else if(key === 'preferredQuality') {
                selectPreferredQuality();
            }
        }
    });
})();

