import sleep from '../util/sleep';

const image = 'https://media.discordapp.net/attachments/756146058924392545/798633291251056670/unknown.png';
let changelogURL;

let version, generated;

let goosemodScope = {};

export const setThisScope = (scope) => {
  goosemodScope = scope;
  changelogURL = `${goosemodScope.moduleStoreAPI.apiBaseURL}/latestChangelogRelease.json?_=${Date.now()}`;
};

export const show = async () => {
  if (!generated) {
    await generate();
  }

  goosemodScope.changelog.resetChangelog();

  goosemodScope.changelog.setChangelog(generated);

  goosemodScope.changelog.showChangelog();

  await sleep(300);

  document.querySelector('.modal-3O0aXp .title-3sZWYQ').textContent = `GooseMod ${version}`; // Set changelog modal title

  document.querySelector('.modal-3O0aXp .footer-2gL1pp').remove(); // Remove footer of modal with social media

  goosemodScope.changelog.resetChangelog();
};

export const generate = async () => {
  const changelog = await (await fetch(changelogURL)).json();

  version = changelog.version;

  generated = {
    image,

    date: changelog.date,
    body: changelog.body
  };
};