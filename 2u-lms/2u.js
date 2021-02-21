// ==UserScript==
// @name           2U Better
// @description    Adds enhancements to the LMS 2U
// @author         Jared Beach
// @include        https://2vu.engineeringonline.vanderbilt.edu/*
// @version        1.0
// @namespace      2uBetter
// ==/UserScript==

function TwoVuBetter() {
  /** @type {import("two-vu-better").TwoVuBetter} */
  const self = this;
  self.vjs = undefined;
  self.player = undefined;

  const getWindow = () => {
    const frame = document.querySelector('iframe');
    return (frame && frame.contentWindow) || window;
  }

  const addCustomCss = () => {
    const styleTag = getWindow().document.createElement('link');
    styleTag.rel = 'stylesheet';
    styleTag.href = 'https://gistcdn.githack.com/jmbeach/3b73fc8a33565789ee1b73d1a68276be/raw/3fa09484bcb32dcc4f776871fb8000296ff4e527/2vu.css';
    getWindow().document.body.prepend(styleTag);
    window.document.body.prepend(styleTag);
  }

  const getNextLectureButton = () => {
    return getWindow().document.querySelectorAll('.styles__Arrow-sc-1vkc84i-0')[1];
  }

  const getLectureButtons = () => {
    return getWindow().document.querySelectorAll('.button.button--hover.styles__NavigationItemButton-v6r7uk-3.ijvtUw');
  }

  const addSkipForwardButton = () => {
    const script = document.createElement('script');
    script.innerHTML = `
    addSkipForwardButton();
    `;
    document.body.appendChild(script);
  }

  const addSkipBackwardButton = () => {
    const script = document.createElement('script');
    script.innerHTML = `
    addSkipBackwardButton();
    `;
    document.body.appendChild(script);
  }

  const play = () => {
    const script = document.createElement('script');
    script.innerHTML = `
      play();
    `;
    document.body.appendChild(script);
  }

  const storeCurrentTime = () => {
    const script = document.createElement('script');
    script.innerHTML = `
    storeCurrentTime();
    `;
    document.body.appendChild(script);
  }

  const getCourseCards = () => {
    return document.querySelector('div._3N6Oy._38vEw.k83C2').children;
  }

  const onVideoEnded = () => {
    if (parseInt(getCurrentSection()) >= getLectureButtons().length) {
      return;
    }

    // auto-advance
    // wait for arrow to enable
    const isEnabledTimer = setInterval(() => {
      // @ts-ignore
      if (getNextLectureButton().disabled) {
        return;
      }

      clearInterval(isEnabledTimer);
      const event = getWindow().document.createEvent('Events');
      event.initEvent('click', true, false);
      getNextLectureButton().dispatchEvent(event);
    }, 100);
  }

  const onVideoChanged = () => {
    setTimeout(() => {
      init();
    }, 500);
  }

  const setPlayBackRateFromStorage = () => {
    const script = document.createElement('script');
    script.innerHTML = `
    setPlayBackRateFromStorage();
    `;
    document.body.appendChild(script);
  }

  const onLoaded = () => {
    // @ts-ignore
    if ((new Date() - window.twoVuLoaded) < 500) {
      return;
    }

    // do only once
    // @ts-ignore
    if (!window.twoVuLoaded) {
      var observer = new MutationObserver((mutationList) => {
        if (mutationList.length !== 2
          || mutationList[0].type !== 'childList'
          || mutationList[1].type !== 'childList'
          // @ts-ignore
          || mutationList[0].target.className !== 'card__body') {
          return;
        }

        onVideoChanged();
      });

      try {
        observer.observe(document.querySelectorAll(
          '[class*=styles__Player] [class*=ContentWrapper] [class*=ElementCardWrapper] [class*=HarmonyCardStyles] .card__body')[1],
          { childList: true });
      }
      catch {
        // let this fail when there's only one video
      }
    }

    // @ts-ignore
    window.twoVuLoaded = new Date();
    addCustomCss();
    play();
    addSkipBackwardButton();
    addSkipForwardButton();
    setPlayBackRateFromStorage();
    setInterval(storeCurrentTime, 1000);
  }

  const initVideoPage = () => {
    sessionStorage.removeItem('VJS_LOADED');
    // add helpers
    const script = getWindow().document.createElement('script');
    script.innerHTML = `
    const SKIP_SIZE = 15;
    const STORAGE_CURRENT_TIME = 'current-time_';
    const STORAGE_PLAYBACK_RATE = 'playback-rate';
    const getWindow = () => {
      const frame = document.querySelector('iframe');
      return (frame && frame.contentWindow) || window;
    }

    const getLectureButtons = () => {
      return getWindow().document.querySelectorAll('.button.button--hover.styles__NavigationItemButton-v6r7uk-3.ijvtUw');
    }
    
    const getPlayer = () => {
      return getWindow().videojs('vjs-player');
    }

    const play = () => {
      const playInterval = setInterval(() => {
        if (!getPlayer().paused()) {
          clearInterval(playInterval);
          return;
        }

        getPlayer().play();
      }, 250);
    }

    const addSkipForwardButton = () => {
      if (getPlayer().controlBar.getChildById('skipForwardButton')) {
        return;
      }
  
      const btn = getPlayer().controlBar.addChild('button', { id: 'skipForwardButton' });
      'vjs-control vjs-button vjs-control-skip-forward'.split(' ').forEach(c => {
        btn.addClass(c);
      });

      btn.el().onclick = () => {
        getPlayer().currentTime(getPlayer().currentTime() + SKIP_SIZE)
      }
    }

    const addSkipBackwardButton = () => {
      if (getPlayer().controlBar.getChildById('skipBackwardButton')) {
        return;
      }
  
      const btn = getPlayer().controlBar.addChild('button', { id: 'skipBackwardButton' });
      'vjs-control vjs-button vjs-control-skip-backward'.split(' ').forEach(c => {
        btn.addClass(c);
      });

      btn.el().onclick = () => {
        getPlayer().currentTime(getPlayer().currentTime() - SKIP_SIZE)
      }
    }

    const setCurrentTimeFromStorage = () => {
      const storedCurrentTime = localStorage.getItem(getStorageKeyCurrentTime());
  
      // only set if not at the very end of the video
      if (storedCurrentTime && getPlayer().duration() - parseFloat(storedCurrentTime) >= 5) {
        getPlayer().currentTime(parseFloat(storedCurrentTime));
      }
    }

    const storeCurrentTime = () => {
      if (getPlayer().paused() || getPlayer().currentTime() <= 1) {
        return;
      }
  
      localStorage.setItem(getStorageKeyCurrentTime(), getPlayer().currentTime().toString());
    }

    const getCurrentSection = () => {
      // happens when there's only one video
      if (!getLectureButtons().length) {
        return '';
      }
  
      // @ts-ignore
      return getWindow().document.querySelector('button.button--primary.styles__NavigationItemButton-v6r7uk-3.ijvtUw').innerText;
    }
  
    const getStorageKeyCurrentTime = () => {
      return STORAGE_CURRENT_TIME + window.location.href + '_' + getCurrentSection();
    }

    const setPlayBackRateFromStorage = () => {
      const storedPlaybackRate = localStorage.getItem(STORAGE_PLAYBACK_RATE);
      if (storedPlaybackRate) {
        getPlayer().playbackRate(parseFloat(storedPlaybackRate));
      }
    }
    
    const loadInterval = setInterval(() => {
      try {
        const player = getPlayer();
        if (player.readyState() < 4) {
          return;
        }

        clearInterval(loadInterval);
        window.postMessage({
          type: 'VJS_LOADED'
        })
        player.on('ratechange', () => {
          localStorage.setItem(STORAGE_PLAYBACK_RATE, rate);
        });
        player.on('ended', () => {
          window.postMessage({ type: 'VJS_ENDED' }, '*');
        });
        player.on('durationchange', () => {
          setCurrentTimeFromStorage();
        });
      } catch (err) {
      }
    }, 250)`
    getWindow().document.body.appendChild(script);
    getWindow().addEventListener('message', ({data}) => {
      if (data.type === 'VJS_LOADED') {
        if (sessionStorage.getItem('VJS_LOADED')) {
          return;
        }

        sessionStorage.setItem('VJS_LOADED', 'true')
        onLoaded();
      } else if (data.type === 'VJS_ENDED') {
        onVideoEnded();
      }
    });
  }

  const onDashboardLoaded = _ => {
    fetch('https://2vu.engineeringonline.vanderbilt.edu/graphql', {
      method: 'POST',
      headers: {
        'apollographql-client-version': '0.98.2',
        'apollographql-client-name': 'dashboard',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        "operationName": "CourseworkForStudentSection",
        "variables": {},
        "query": "fragment DashboardStudyListTopicFragment on StudyListTopic {\n  moduleUuid\n  topicUuid\n  name\n  moduleOrder\n  moduleOrderLabel\n  order\n  orderLabel\n  url\n  __typename\n}\n\nquery CourseworkForStudentSection {\n  sections(filterByIsLive: true, ignoreMismatchedSectionEntitlements: true) {\n    name\n    uuid\n    courseOutline {\n      modules {\n        uuid\n        name\n        order\n        orderLabel\n        videoDurationSeconds\n        topics {\n          uuid\n          name\n          order\n          orderLabel\n          typeLabel\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    topicCompletions {\n      userUuid\n      topicUuid\n      __typename\n    }\n    dueDates {\n      topicUuid\n      dueDate\n      __typename\n    }\n    studyListTopics {\n      ...DashboardStudyListTopicFragment\n      __typename\n    }\n    __typename\n  }\n}\n"
      })
    }).then(res => {
      return res.json()
    }).then(data => {
      for (const section of data.data.sections) {
        for (const module of section.courseOutline.modules) {
          const match = document.querySelector(`a[href*="${module.uuid}"]`);
          if (match) {
            match.innerHTML = `${module.orderLabel}: ${match.innerHTML}`;
            const card = match.parentElement.parentElement.parentElement;
            const h2 = card.querySelector('h2');
            // for some reason the last number after the dash isn't in the page
            const nameParts = section.name.split('-');
            const shortName = `${nameParts[0]}-${nameParts[1]}`;
            h2.innerHTML = h2.innerHTML.replace(shortName, '');
            const smallName = document.createElement('span');
            smallName.innerHTML = shortName;
            smallName.setAttribute('style', 'font-size: 0.8rem; display: block;');
            h2.appendChild(smallName)
          }
        }
      }
    }).catch(err => {
      throw err;
    })
  }

  const initDashboard = () => {
    const loadTimer = setInterval(() => {
      const cards = getCourseCards();
      if (cards && cards.length) {
        clearInterval(loadTimer);
        onDashboardLoaded(cards);
      }
    }, 250)
  }

  const init = () => {
    if (document.location.href.endsWith('dashboard')) {
      initDashboard();
    } else {
      initVideoPage();
    }
  }

  init();
}

// @ts-ignore
globalThis.twoVuBetter = new TwoVuBetter();