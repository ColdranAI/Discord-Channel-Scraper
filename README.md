# Discord Channel Scraper

<img width="976" height="383" alt="image" src="https://github.com/user-attachments/assets/59c07801-90a4-451c-a7b7-7af9d8b91195" />

Scrape Discord Channels without hitting the Rate Limits. Scrape with Batches

Feel free to file an issue or maybe even drop a pull request. TALK IS CHEAP, DO A PR

### How to Import & Deploy

```yml
project:
  name: discord-channel-scraper
  tags:
    - coldran-ai

services:
  - hostname: web
    type: nodejs@20
    enableSubdomainAccess: true
    buildFromGit: https://github.com/ColdranAI/Discord-Channel-Scraper
  
  - hostname: backend
    type: go@1.22
    enableSubdomainAccess: true
    buildFromGit: https://github.com/ColdranAI/Discord-Channel-Scraper

```

### How to Utilize

- grab a discord token of your alt account via inspect element(not referring to a bot)
- Alt account should be in that server and should have access in to the specific channel you're trying to scrape
- Make sure you have developer option turned on in your account so that
you can just copy channel id and server id with left click.



If you want to help me build [ColdranAI](https://coldran.com) feel free to support me at my [Buymeacoffee](https://buymeacoffee.com/nermalcat69).





