import Head from "next/head";
import { Howl, Howler } from "howler";
import Player from "../components/Player";
import styles from "../styles/Home.module.scss";

export default function Home() {
  const tisSoSweet = [
    {
      track: new Howl({
        src: ["/tissosweet/Acoustic_1.wav"],
        preload: true,
      }),
      name: "Acoustic",
    },
    {
      track: new Howl({
        src: ["/tissosweet/Bass_1.wav"],
        preload: true,
      }),
      name: "Bass",
    },
    {
      track: new Howl({
        src: ["/tissosweet/Carter_1.wav"],
        preload: true,
      }),
      name: "Carter",
    },
    {
      track: new Howl({
        src: ["/tissosweet/Drums.wav"],
        preload: true,
      }),
      name: "Drums",
    },
    {
      track: new Howl({
        src: ["/tissosweet/Electric_1.wav"],
        preload: true,
      }),
      name: "Electric_1",
    },
    {
      track: new Howl({
        src: ["/tissosweet/Mando_1.wav"],
        preload: true,
      }),
      name: "Mando",
    },
    {
      track: new Howl({
        src: ["/tissosweet/Piano_1.wav"],
        preload: true,
      }),
      name: "Piano",
    },
    {
      track: new Howl({
        src: ["/tissosweet/Stacks.wav"],
        preload: true,
      }),
      name: "Stacks",
    },
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Natural Multitrack Player</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className='main'>
        <div className='content'>
          <h1 className='content-title'>Multitrack Player</h1>
        </div>
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
