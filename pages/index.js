import Head from "next/head";
import { Howl, Howler } from "howler";
import styles from "../styles/Home.module.scss";

export default function Home() {
  const sound1 = new Howl({
    src: ["Grey Slush_Stay With Me.mp3"],
  });
  const sound2 = new Howl({
    src: ["My-Chains-Are-Gone.mp3"],
  });

  function allSounds(action) {
    if (action === "play") sound1.play();
    if (action === "pause") sound1.pause();
    if (action === "stop") sound1.stop();
  }
  return (
    <div className={styles.container}>
      <Head>
        <title>Natural Multitrack Player</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Multitrack Player</h1>
        <div className='player' onClick={() => allSounds("play")}>
          Play Sound
        </div>
        <div className='player' onClick={() => allSounds("pause")}>
          Pause Sound
        </div>
        <div className='player' onClick={() => allSounds("stop")}>
          Stop Sound
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href='https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app'
          target='_blank'
          rel='noopener noreferrer'
        >
          Powered by
          <img src='/vercel.svg' alt='Vercel Logo' className={styles.logo} />
        </a>
      </footer>
    </div>
  );
}
