import styles from '../styles/Home.module.scss';
import Explanation from './explanation';
import DiscordExportButton from './discord-export-button';

export default async function Page() {

  return (
    <main className={styles.main}>
      <DiscordExportButton />
      <Explanation />
    </main>
  );
}

