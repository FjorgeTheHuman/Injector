import { sha512 } from '../util/hash';

const JSCache = require('./jsCache');

let goosemodScope = {};

export default {
  setThisScope: (scope) => {
    goosemodScope = scope;
    JSCache.setThisScope(scope);
  },

  modules: [],

  apiBaseURL: 'https://api.goosemod.com',

  jsCache: JSCache,

  updateModules: async () => {
    goosemodScope.moduleStoreAPI.modules = (await (await fetch(`${goosemodScope.moduleStoreAPI.apiBaseURL}/modules.json?_=${Date.now()}`)).json())
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  importModule: async (moduleName) => {
    try {
      const moduleInfo = goosemodScope.moduleStoreAPI.modules.find((x) => x.filename === moduleName);

      const jsCode = await goosemodScope.moduleStoreAPI.jsCache.getJSForModule(moduleName);

      const calculatedHash = await sha512(jsCode);
      if (calculatedHash !== moduleInfo.hash) {
        goosemodScope.showToast(`Cancelled importing of ${moduleName} due to hash mismatch`, {timeout: 2000, type: 'danger'});

        console.warn('Hash mismatch', calculatedHash, moduleInfo.hash);
        return;
      }

      await goosemodScope.importModule({
        filename: `${moduleInfo.filename}.js`,
        data: jsCode
      });

      if (goosemodScope.modules[moduleName].onLoadingFinished !== undefined) {
        await goosemodScope.modules[moduleName].onLoadingFinished();
      }

      let settingItem = goosemodScope.settings.items.find((x) => x[1] === 'Module Store');

      let item = settingItem[2].find((x) => x.subtext === moduleInfo.description);

      item.buttonType = 'danger';
      item.buttonText = 'Remove';
      item.showToggle = true;

      // if (goosemodScope.settings.isSettingsOpen() && !goosemodScope.initialImport) goosemodScope.settings.createFromItems();
    } catch (e) {
      goosemodScope.showToast(`Failed to import module ${moduleName}`, { timeout: 2000, type: 'error' });
      console.error(e);
    }
  },

  moduleRemoved: async (m) => {
    let item = goosemodScope.settings.items.find((x) => x[1] === 'Module Store')[2].find((x) => x.subtext === m.description);
    
    if (item === undefined) return;

    item.buttonType = 'brand';
    item.buttonText = 'Import';
    item.showToggle = false;
  },

  parseAuthors: (a) => {
    let authors = [];

    if (typeof a === "string") {
      authors = a.split(', ');
    } else if (Array.isArray(a)) {
      authors = a;
    };
    
    authors = authors.map((x) => {
      if (x.match(/^[0-9]{18}$/)) { // "<id>"
        const result = goosemodScope.webpackModules.findByProps('getUser').getUser(x);
        return `<span class="author" style="cursor: pointer;" onmouseover="this.style.color = '#ccc'" onmouseout="this.style.color = '#fff'" onclick="try { window.goosemod.webpackModules.findByProps('open', 'fetchMutualFriends').open('${result.id}') } catch (e) { }">${result.username}<span class="description-3_Ncsb">#${result.discriminator}</span></span>`; // todo
      }

      let idMatch = x.match(/(.*) \(([0-9]{18})\)/); // "<name> (<id>)"
      if (idMatch === null) return `<span class="author">${x}</span>`; // "<name>"

      return `<span class="author" style="cursor: pointer;" onmouseover="this.style.color = '#ccc'" onmouseout="this.style.color = '#fff'" onclick="try { window.goosemod.webpackModules.findByProps('open', 'fetchMutualFriends').open('${idMatch[2]}') } catch (e) { }">${idMatch[1]}</span>`; // todo
    });

    return authors.join('<span class="description-3_Ncsb">,</span> ');
  },

  updateStoreSetting: () => {
    let item = goosemodScope.settings.items.find((x) => x[1] === 'Module Store');

    item[2] = item[2].slice(0, 5);

    let sortedCategories = goosemodScope.moduleStoreAPI.modules.reduce((cats, o) => cats.includes(o.category) ? cats : cats.concat(o.category), []).sort((a, b) => a.localeCompare(b));

    let arr = Object.entries(goosemodScope.moduleStoreAPI.modules.reduce((cats, o) => {
      if (!cats[o.category]) cats[o.category]=[];
      cats[o.category].push(o);
      return cats;
    },{})).sort((a, b) => a[0].localeCompare(b[0])).map(o => o[1]);

    let funIndex = sortedCategories.indexOf('fun');

    sortedCategories.push(sortedCategories.splice(funIndex, 1)[0]);
    arr.push(arr.splice(funIndex, 1)[0]);

    for (let i = 0; i < arr.length; i++) {
      /*item[2].push({
        type: 'header',
        text: sortedCategories[i].replace(/\-/g, ' ')
      });*/

      for (let m of arr[i]) {
        item[2].push({
          type: 'card',
          
          class: m.category,

          buttonType: goosemodScope.modules[m.filename] ? 'danger' : 'brand',
          showToggle: goosemodScope.modules[m.filename],

          text: `${m.name} <span class="description-3_Ncsb">by</span> ${goosemodScope.moduleStoreAPI.parseAuthors(m.author)}`, // ` <span class="description-3_Ncsb">(v${m.version})</span>`,
          subtext: m.description,
          subtext2: `v${m.version}`,

          buttonText: goosemodScope.modules[m.filename] ? 'Remove' : 'Import',
          onclick: async (el) => {
            if (goosemodScope.modules[m.filename]) {
              el.textContent = 'Removing...';

              goosemodScope.settings.removeModuleUI(m.filename, 'Module Store');

              return;
            }

            el.textContent = 'Importing...';

            await goosemodScope.moduleStoreAPI.importModule(m.filename);

            goosemodScope.settings.openSettingItem('Module Store');
          },
          isToggled: () => goosemodScope.modules[m.filename] !== undefined,
          onToggle: async (checked) => {
            if (checked) {
              goosemodScope.modules[m.filename] = Object.assign({}, goosemodScope.disabledModules[m.filename]);
              delete goosemodScope.disabledModules[m.filename];

              await goosemodScope.modules[m.filename].onImport();

              if (goosemodScope.modules[m.filename].onLoadingFinished !== undefined) {
                await goosemodScope.modules[m.filename].onLoadingFinished();
              }

              goosemodScope.loadSavedModuleSetting(m.filename);
            } else {
              goosemodScope.disabledModules[m.filename] = Object.assign({}, goosemodScope.modules[m.filename]);

              goosemodScope.modules[m.filename].remove();

              delete goosemodScope.modules[m.filename];
            }

            goosemodScope.settings.openSettingItem('Module Store');
          }
        });
      }
    }
  }
}
