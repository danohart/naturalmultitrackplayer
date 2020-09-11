import { useState } from "react";
import Track from "./Track";

export default function Player(props) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  function allSounds(action) {
    if (action === "play")
      if (props.song[props.song.length - 1].state() === "loading") return null;
    setIsPaused(false), props.song.map((track) => track.play());
    if (action === "pause")
      setIsPaused(true), props.song.map((track) => track.pause());
    if (action === "stop") props.song.stop();
  }

  function muteTrack(event) {}

  return (
    <div className='player'>
      {isPaused ? (
        <div className='player-play button' onClick={() => allSounds("play")}>
          &#x3e; Play
        </div>
      ) : (
        <div className='player-pause button' onClick={() => allSounds("pause")}>
          || Pause
        </div>
      )}
      <div className='player-tracks'>
        {props.song.map((track, index) => (
          <Track key={index} track={{ song: track, key: index }} />
        ))}
      </div>
    </div>
  );
}
