import Head from "next/head";
import { Howl, Howler } from "howler";
import Player from "../components/Player";
import styles from "../styles/Home.module.scss";

export default function Home() {
  const tisSoSweet = [
    new Howl({
      src: ["/tissosweet/Acoustic_1.wav"],
      preload: true,
    }),
    new Howl({
      src: ["/tissosweet/Bass_1.wav"],
      preload: true,
    }),
    new Howl({
      src: ["/tissosweet/Carter_1.wav"],
      preload: true,
    }),
    new Howl({
      src: ["/tissosweet/Drums.wav"],
      preload: true,
    }),
    new Howl({
      src: ["/tissosweet/Electric_1.wav"],
      preload: true,
    }),
    new Howl({
      src: ["/tissosweet/Mando_1.wav"],
      preload: true,
    }),
    new Howl({
      src: ["/tissosweet/Piano_1.wav"],
      preload: true,
    }),
    new Howl({
      src: ["/tissosweet/Stacks.wav"],
      preload: true,
    }),
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Natural Multitrack Player</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Multitrack Player</h1>
        <Player song={tisSoSweet} />
      </main>

      <footer className={styles.footer}>
        <a
          href='https://naturalmusicstore.com/'
          target='_blank'
          rel='noopener noreferrer'
        >
          Powered by &nbsp;<strong>Natural Music</strong>
        </a>
      </footer>
    </div>
  );
}
