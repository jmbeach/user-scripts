// ==UserScript==
// @name           Gmail Filter/Rule Finder
// @description    A brief description of your script
// @author         Your Name
// @include        https://mail.google.com*
// @version        1.0
// ==/UserScript==

'use-strict';

const scripts = [...document.getElementsByTagName('script')]
const script = scripts.map(x => x.innerHTML.trim()).filter(x => x.startsWith('_GM_setData'))[0]
const scriptParseRegex = /sdpc","([^"]+)/
const token = scriptParseRegex.exec(script)[1]
const filterDataUrl = 'https://mail.google.com/sync/u/0/i/s?hl=en&c=0'
const filterUrl = 'https://mail.google.com/mail/u/0/?ui=2&ik=d6908662ef&jsver=8HwiEZd1ZS8.en.&cbl=gmail_fe_210205.08_p3&view=fdl&zx=or7ar6po6gna';
const formData = new FormData()
fetch(filterDataUrl, {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'connection': 'keep-alive',
        'x-framework-xsrf-token': token,
        'x-gmail-btai': JSON.stringify({"3":{"6":0,"10":1,"13":1,"15":0,"16":1,"17":1,"18":0,"19":1,"22":1,"23":1,"24":1,"25":1,"26":1,"27":1,"28":1,"29":0,"30":1,"31":1,"32":1,"33":1,"34":1,"35":0,"36":1,"37":"en","38":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36","39":1,"40":0,"41":25,"43":0,"44":1,"45":0,"46":1,"47":1,"48":1,"49":1,"50":1,"51":0,"52":1,"53":1,"54":0,"55":1,"56":1,"57":0,"58":0,"60":0,"61":0},"5":"d6908662ef","7":25,"8":"gmail_fe_210208.03_p3","9":1,"10":5,"11":"","12":-21600000,"13":"-06:00","14":1,"16":357259581,"17":"","18":"","19":"1613563252931"}),
        'user-agent': 'PostmanRuntime/7.26.8'
    },
    body: JSON.stringify({
        "1": {
            "1": 1,
            "4": 0
        },
        "3": {
            "1": 1,
            "5": {
                "2": 25
            },
            "7": 1
        },
        "4": {
            "2": 0,
            "4": 0,
            "5": 322
        },
        "5": 2
    })
}).then(data => {
    return data.json()
}).then(data => {
    /* data actually has everything in it, but go get
     * an XML version so we can make sense of it */
    const filterIds = data[2][6].map(x => x[3]).filter(x => x).map(x => x[2][1]).join(',');
    formData.append('tfi', filterIds);
    return fetch(filterUrl, {
        method: 'POST',
        body: formData
    });
}).then(filters => {
    return filters.text()
}).then(filters => {
    const domparser = new DOMParser()
    const doc = domparser.parseFromString(filters, 'text/xml')
    const entries = doc.getElementsByTagName('entry')
    const parsed = []
    for (const entry of entries) {
        const filterProperties = entry.getElementsByTagName('apps:property')
        const parsedEntry = {}
        const id = entry.getElementsByTagName('id')[0].innerHTML
        parsedEntry.id = id.trim();
        for (const filterProperty of filterProperties) {
            const name = filterProperty.getAttribute('name')
            const value = filterProperty.getAttribute('value')
            parsedEntry[name] = value
        }

        parsed.push(parsedEntry)
    }

    sessionStorage.setItem('filters', JSON.stringify(parsed));
});

function findMatchingRules(from) {
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    const filter = filters.filter(x => x.from && x.from.toLowerCase() === from);
    return filter;
}

function goToFilter(filter) {
    const baseUrl = 'https://mail.google.com/mail/u/0/#create-filter/';
    const params = new URLSearchParams();
    if (filter.from) {
        params.set('from', filter.from)
    }

    if (filter.sizeOperator) {
        params.set('sizeoperator', filter.sizeOperator)
    }

    if (filter.sizeUnit) {
        params.set('sizeunit', filter.sizeUnit)
    }

    if (filter.hasTheWord) {
        params.set('has', filter.hasTheWord)
    }

    const fullUrl = `${baseUrl}${params.toString()}`
    document.location = fullUrl;
}

function getActiveEmail() {
    return document.querySelector('span.gD[email]')
}

function parseActiveEmail() {
    const fromElement = getActiveEmail()
    const from = fromElement.getAttribute('email');
    return {
        from: from
    };
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
    content.style = 'display: flex; flex: 1;padding: 0.25rem; overflow-y: auto;';
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

function showFoundFiltersPopup(filters) {
    const popup = createPopup();
    for (const filter of filters) {
        const filterEl = document.createElement('div');
        filterEl.style = 'width: 100%; height: 5rem;';
        const filterSpan = document.createElement('span');
        Object.keys(filter).reduce((a, b) => {
            if (b === 'id') {
                return a;
            }

            if (a === '') {
                return `${b}: ${filter[b]}`;
            }

            return a + ' | ' + `${b}: ${filter[b]}`;
        }, '');
        popup.content.appendChild(filterSpan);
    }
}

function showNoFiltersFoundPopup() {
    const popup = createPopup();
    const text = document.createElement('span');
    text.innerHTML = 'No filters found';
    popup.content.appendChild(text);
}

function addFindFilterButton() {
    const menus = document.querySelectorAll('div[role=menu].b7.J-M')
    for (const menu of menus) {
        const existing = document.getElementById('btnFindfilter')
        if (existing) {
            return;
        }
    
        const button = `<div class="J-N" role="menuitem" id="btnFindfilter" jslog="21576; u014N:cOuCgd,Kr2w4b" style="user-select: none;">
        <div class="J-N-Jz">
            <div>
                <div id=":qo" class="cj" act="94"><img class="mL f4 J-N-JX" src="images/cleardot.gif" alt="" style="background-image: url(https://www.gstatic.com/images/icons/material/system/1x/search_black_20dp.png)">Find Filter</div>
            </div>
        </div>
    </div>`
        const buttonEl = document.createElement('div')
        buttonEl.innerHTML = button;
        buttonEl.firstChild.onclick = function () {
            filters = findMatchingRules(parseActiveEmail().from);
            if (filters && filters.length > 1) {
                showFoundFiltersPopup(filters);
            } else if (filters && filters.length === 1) {
                goToFilter(filters[0]);
            } else {
                showNoFiltersFoundPopup();
            }
        }
        buttonEl.firstChild.onmouseover = e => {
            e.currentTarget.setAttribute('class', 'J-N J-N-JT');
        }
    
        buttonEl.firstChild.onmouseleave = e => {
            e.currentTarget.setAttribute('class', 'J-N');
        }
    
        menu.appendChild(buttonEl.firstChild);
    }
}

function getEmailGrid() {
    const matches = document.querySelectorAll('table[role=grid]');
    return matches[matches.length - 1];
}

function getEmailElements() {
    if (!getEmailGrid()) {
        return null;
    }

    return getEmailGrid().querySelectorAll('tr')
}

function waitForEmail() {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (!getActiveEmail()) {
                console.log('waiting for active email')
                return;
            }
    
            clearInterval(interval);
            resolve();
        }, 250);
    })
}

function addEmailClickHandlers() {
    emails = getEmailElements()
    var emailObserver = new MutationObserver(mutationList => {
        console.log('email mutation list', mutationList);
    });
    for (const emailEl of emails) {
        emailEl.onclick = () => {
            try {
                emailObserver.disconnect();
            } catch (err) {}
            waitForEmail().then(() => {
                addFindFilterButton();
                emailObserver = new MutationObserver(mutationList => {
                    console.log('email mutation list', mutationList);
                });
    
                emailObserver.observe(getActiveEmail(), {
                    childList: true
                });
            });
        };
    }
}

const listObserver = new MutationObserver(mutationList => {
    console.log('mutation list', mutationList)
});

const interval = setInterval(() => {
    try {
        listObserver.observe(getEmailGrid(), {
            childList: true
        });
        clearInterval(interval);
        addEmailClickHandlers();
    }
    catch (err) {
        // ignore
    }
});