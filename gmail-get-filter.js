// ==UserScript==
// @name           My Script
// @description    A brief description of your script
// @author         Your Name
// @include        https://mail.google.com*
// @version        1.0
// ==/UserScript==

'use-strict';

const filterUrl = 'https://mail.google.com/mail/u/0/?ui=2&ik=d6908662ef&jsver=8HwiEZd1ZS8.en.&cbl=gmail_fe_210205.08_p3&view=fdl&zx=or7ar6po6gna';
const formData = new FormData()
formData.append('tfi', '564913279819412674,6502234381025998287,954838030823100862,z0000001609168320654*6421297474395585715,z0000001612190189872*4729536718674188861,z0000001612725995810*4241382161248637424,z0000001612726833498*1022883995041212718,z0000001612727031577*7469650801734823110,z0000001612727079818*9179209173190379660,z0000001612727119019*1363745348298479445,z0000001612727140894*3369425243435578162,z0000001612727181644*0110227076110377724,z0000001612738018049*4075131889468033193,z0000001612801481333*4636788238658466074,z0000001612801551632*0771752096714410171,z0000001612865982731*1043427023003409992,z0000001612866028429*7165400401114514873,z0000001612866087759*8971843072935479720,z0000001612866341923*6440496965065644560,z0000001612866421056*5074224086466425401,z0000001612866459830*1247417980096794268,z0000001612867120671*1143140153947481699,z0000001612869838724*1164719178243452447,z0000001612869871194*5958554085973244823,z0000001612879272387*3694572167280191790,z0000001612893671249*3258120632413067623,z0000001612914443833*3208194262210394590,z0000001612914519797*4615046091958149991,z0000001612914709657*2384553422735397476,z0000001612914787848*7490625382074206364,z0000001612914846995*1278935940861789071,z0000001612914937480*7504070481429677978,z0000001612915005554*4861484489107452225,z0000001612915043974*8717281031496297097,z0000001612915127632*4941068997368988564,z0000001612915194968*4680980866104256865,z0000001612915245231*8785849257399161384,z0000001612915298081*4003288129257110208,z0000001612915329101*2773908217805619877,z0000001612915364665*5190826611924167878,z0000001612921978948*7646883577139875210,z0000001612990089758*1003486946883000492,z0000001612990154051*5366056971498233810,z0000001612990238965*5438612686932883648,z0000001612990278236*8627542192076129281,z0000001612990337276*4497787724550897230,z0000001612990498475*0181432936668798859,z0000001612990535331*6782091089818603064,z0000001612990569287*1242426109952290320,z0000001613008862360*3587783141017594005,z0000001613009364874*1259403304852458391,z0000001613009433029*0988522307871129014,z0000001613009465833*6643422217050153559,z0000001613149736975*0249284965590476690,z0000001613228230395*7904452358018377391,z0000001613228290777*5561109913936690488,z0000001613228437451*5665118247844809330,z0000001613228599309*0209403304976698626')
fetch(filterUrl, {
    method: 'POST',
    body: formData
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
    const menu = document.querySelector('div[role=menu].b7.J-M')
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
        } else if (filters && filter.length === 1) {
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