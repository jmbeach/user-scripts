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
  const STORAGE_PLAYBACK_RATE = 'playback-rate';
  const STORAGE_CURRENT_TIME = 'current-time_';
  const SKIP_SIZE = 15;

  // Set to true to enable debug logging
  const log = new DebugLog(false);
  self.vjs = undefined;
  self.player = undefined;
  self.isNavigating = false;
  self.useCachedVideoTime = true;

  const getWindow = () => {
    const frame = document.querySelector('iframe');
    return (frame && frame.contentWindow) || window;
  }

  const addCustomCss = () => {
    const styleTag = getWindow().document.createElement('link');
    styleTag.rel = 'stylesheet';
    styleTag.href = 'https://rawcdn.githack.com/jmbeach/user-scripts/3b16a50b558cc9854f9786e96b5c64b8367234e8/2u-lms/2u.css';
    getWindow().document.body.prepend(styleTag);
    window.document.body.prepend(styleTag);
  }

  const getNextLectureButton = () => {
    return getWindow().document.querySelectorAll('.styles__Arrow-sc-1vkc84i-0')[1];
  }

  const getLectureButtons = () => {
    return getWindow().document.querySelectorAll('.button.button--hover.styles__NavigationItemButton-v6r7uk-3.ijvtUw');
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

  const addSkipForwardButton = () => {
    if (self.player.controlBar.getChildById('skipForwardButton')) {
      return;
    }

    const btn = self.player.controlBar.addChild('button', {id: 'skipForwardButton'});
    'vjs-control vjs-button vjs-control-skip-forward'.split(' ').forEach(c => {
      btn.addClass(c);
    });
    // @ts-ignore
    btn.el().onclick = () => {
      self.player.currentTime(self.player.currentTime() + SKIP_SIZE)
    }
  }

  const addSkipBackwardButton = () => {
    if (self.player.controlBar.getChildById('skipBackwardButton')) {
      return;
    }

    const btn = self.player.controlBar.addChild('button', {id: 'skipBackwardButton'});
    'vjs-control vjs-button vjs-control-skip-backward'.split(' ').forEach(c => {
      btn.addClass(c);
    });
    // @ts-ignore
    btn.el().onclick = () => {
      self.player.currentTime(self.player.currentTime() - SKIP_SIZE)
    }
  }

  const storeCurrentTime = () => {
    if (self.isNavigating || !self.player) {
      return;
    }

    if (self.player.paused() || self.player.currentTime() <= 1) {
      return;
    }

    localStorage.setItem(getStorageKeyCurrentTime(), self.player.currentTime().toString());
  }

  const getCourseCards = () => {
    const cards = document.querySelector('div._3N6Oy._38vEw.k83C2');
    if (cards) {
      return cards.children;
    }

    return null;
  }

  const onRateChange = () => {
    localStorage.setItem(STORAGE_PLAYBACK_RATE, self.player.playbackRate().toString());
  }

  const onVideoEnded = () => {
    if (parseInt(getCurrentSection()) >= getLectureButtons().length) {
      return;
    }

    self.isNavigating = true;

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

  const setCurrentTimeFromStorage = () => {
    // Only want to do this once per load
    if (!self.useCachedVideoTime) {
      return;
    }

    self.useCachedVideoTime = false;

    const storedCurrentTime = localStorage.getItem(getStorageKeyCurrentTime());

    // only set if not at the very end of the video
    if (storedCurrentTime && self.player.duration() - parseFloat(storedCurrentTime) >= 5) {
      self.player.currentTime(parseFloat(storedCurrentTime));
    }
  }

  const setPlayBackRateFromStorage = () => {
    const storedPlaybackRate = localStorage.getItem(STORAGE_PLAYBACK_RATE);
    if (storedPlaybackRate) {
      self.player.playbackRate(parseFloat(storedPlaybackRate));
    }
  }

  const deleteSupportChat = () => {
    const waiter = setInterval(() => {
      const chat = document.querySelector('.intercom-lightweight-app');
      if (chat) {
        clearInterval(waiter);
        chat.remove();
      }
    });
  }

  const onDurationChanged = () => {
    setCurrentTimeFromStorage();
    self.isNavigating = false;
  }

  const onLoaded = () => {
    deleteSupportChat();

    // @ts-ignore
    if ((new Date() - window.twoVuLoaded) < 500) {
      return;
    }

    // do only once
    // @ts-ignore
    if (!window.twoVuLoaded) {
      const observer = new MutationObserver((mutationList) => {
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
          {childList: true});
      }
      catch {
        // let this fail when there's only one video
      }
    }

    // @ts-ignore
    window.twoVuLoaded = new Date();
    addCustomCss();
    const player = self.vjs('vjs-player');
    self.player = player;
    addSkipBackwardButton();
    addSkipForwardButton();
    player.on('ratechange', onRateChange);
    player.on('ended', onVideoEnded);
    setPlayBackRateFromStorage();
    player.play();
    player.on('durationchange', onDurationChanged);
    setInterval(storeCurrentTime, 1000);
  }

  function createPopup() {
    const overlay = document.createElement('div');
    overlay.style = 'background-color: rgba(0,0,0,0.3);width: 100%;height:100%;z-index:1000;display: flex; position: absolute; top:0; justify-content: center; flex-direction: column; align-items: center;';
    const popup = document.createElement('div');
    popup.style = "position: absolute; width: 25rem; height: 20rem; display: flex; flex-align: center; background-color: white; flex-direction: column; border-radius: 0.25rem;"
    const toolbar = document.createElement('div')
    toolbar.style = 'display: flex; justify-content: flex-end;'
    const x = document.createElement('button');
    x.style = 'background-color: #333; color: white; padding: 0.25rem 0.5rem; padding: 0.25rem;'
    x.innerHTML = 'X';
    x.onclick = function () {
        overlay.remove();
    }

    toolbar.appendChild(x)
    const content = document.createElement('div');
    content.style = 'display: flex; flex: 1;padding: 0.25rem; overflow-y: auto; flex-direction: column';
    popup.appendChild(toolbar);
    popup.appendChild(content);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    return {
        popup,
        content,
        toolbar
    }
}

  const getCourseContentLinks = () => {
    return document.querySelectorAll('a[href*="/segment/"].qCni6');
  }

  const waitForCourseContentLinks = () => {
    return new Promise(resolve => {
      const contentChecker = setInterval(() => {
        const links = getCourseContentLinks();
        if (links && links.length) {
          clearInterval(contentChecker);
          resolve(links);
        }
      }, 250);
    });
  }

  const initCoursePage = () => {
    log.debug('[initCoursePage]');
    waitForCourseContentLinks().then(links => {
      for (const link of links) {
        // don't add multiple times
        if (link.parentElement.parentElement.querySelector('.two-u-better')) {
          continue;
        }

        const newButton = document.createElement('button');
        newButton.innerText = '📥';
        newButton.setAttribute('data-href', link.getAttribute('href'))
        newButton.onclick = e => {
          const href = e.currentTarget.dataset.href;
          const section = /(?<=sections\/)[^\/]+/.exec(href)[0];
          const segment = /(?<=segment\/)[^\/]+/.exec(href)[0];
          fetch(`/content/v2/segments/${segment}?sectionUuid=${section}`).then(res => {
            return res.json();
          }).then(data => {
            const any = data.segment.elements.filter(x => x.video_uuid);
            const popup = createPopup();
            if (!any.length) {
              const warning = document.createElement('p');
              warning.innerHTML = 'No videos found';
              popup.content.appendChild(warning);
              return;
            }

            const instructions = document.createElement('p');
            instructions.innerHTML = 'Right click each link and "save as"';
            popup.content.appendChild(instructions);
            for (const segment of data.segment.elements) {
              const videoLink = `/content/files-api/files/${segment.video_uuid}?label=1080p`;
              const link = document.createElement('a');
              link.innerHTML = segment.name;
              link.href = videoLink;
              popup.content.appendChild(link);
            }
          })
        };
        const buttonWrapper = document.createElement('div');
        buttonWrapper.setAttribute('class', 'A3_E- two-u-better');
        buttonWrapper.setAttribute('role', 'cell');
        buttonWrapper.appendChild(newButton);
        
        link.parentElement.parentElement.appendChild(buttonWrapper);
      }
    })
  }

  const initVideoPage = () => {
    log.debug('[initVideoPage]');
    self.player = undefined;
    const loadTimer = setInterval(() => {
      if (typeof self.vjs === 'undefined') {
        // @ts-ignore
        self.vjs = getWindow().videojs;
        if (typeof self.vjs === 'undefined') {
          return;
        }
      }
  
      // the player itself isn't loaded yet
      if (!getWindow().document.getElementById('vjs-player')) {
        return;
      }
  
      clearInterval(loadTimer);
      onLoaded();
    }, 500);
  }

  const onDashboardLoaded = _ => {
    deleteSupportChat();
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
    log.debug('[initDashboard]');
    const loadTimer = setInterval(() => {
      const cards = getCourseCards();
      if (cards && cards.length) {
        clearInterval(loadTimer);
        onDashboardLoaded(cards);
      }
    }, 250)
  }

  const watchUrlChanges = () => {
    // don't setup multiple observers
    if (self.urlObserver) {
      return;
    }

    // listen for URL changes
    self.currentLocation = document.location.href;

    self.urlObserver = new MutationObserver((mutationList) => {
      if (self.currentLocation !== document.location.href) {
        self.currentLocation = document.location.href;

        // location changed
        log.debug('[watchUrlChanges] - url changed')

        init();
      }
    });

    const root = document.getElementById('root');

    // don't do this in an iFrame
    if (!root) {
      return;
    }

    self.urlObserver.observe(root, { childList: true, subtree: false });
  }

  const init = () => {
    const href = getWindow().document.location.href;
    log.debug('[init]', href);
    if (href.endsWith('dashboard')) {
      initDashboard();
    } else if (href.indexOf('/segment/') > -1 || href.indexOf('/player/') > -1) {
      initVideoPage();
    } else {
      initCoursePage();
    }

    watchUrlChanges();
  }

  init();
}

function DebugLog(enabled) {
  this.debug = (...logArgs) => {
    if (!enabled) return;
    console.debug(...logArgs);
  }
}

// @ts-ignore
window.twoVuBetter = new TwoVuBetter();
