import styles from '../styles/Home.module.scss';

export default function Explanation() {
  return (
    <div className={styles.explanation}>
      <p>
      <b>WE DON'T SAVE ANYTHING.</b>
      </p>

      <details className={styles.details}>
        <summary>
          <span>How do i use this?</span>
        </summary>
        <p>
          - <code>CHANNEL_ID</code>: The Discord channel ID you want to export - <a href="https://www.wikihow.com/Find-Discord-ID" target="_blank" rel="noopener noreferrer">learn more</a>
          <br />
          - <code>DISCORD_TOKEN</code> - Your Discord user token (from browser dev tools) - <a href="https://www.androidauthority.com/get-discord-token-3149920/" target="_blank" rel="noopener noreferrer">learn more</a>
        </p>
      </details>

      <p>
        <em>
          _💡 We use batch based scraping to avoid rate limiting :3 + OPEN SOURCE AT 500 LIKES ON IT'S X POST_
        </em>{' '}
        <br />
        <br />
        We only allow 10 batches at a time because this is free and after it's open source you can just run it locally and scrape as much as you want.
        <br />
        <span className={styles.explanation_notes}>
          Make sure your alt account is in the server where the channel is located // Also if you want something custom, <a href="https://x.com/ArjunShips" target="_blank" rel="noopener noreferrer">DM me on X</a>
          <br />
          <br />
          Also if you don't know what to do with this data, If you're a startup you can just analyze your customers and see what they're saying about your product by feeding it to ChatGPT with Deep Research Mode
          <br />
          <br />
          <b>If you're a startup, you can just analyze your customers and see what they're saying about your product by feeding it to ChatGPT with Deep Research Mode</b>
        </span>
      </p>
    </div>
  );
}
