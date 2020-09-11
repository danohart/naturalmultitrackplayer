import { useState, useEffect } from "react";
import Track from "./Track";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faStop } from "@fortawesome/free-solid-svg-icons";

export default function Player(props) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  useEffect(() => {
    setInterval(function () {
      if (props.song[props.song.length - 1].state() === "loaded")
        setIsLoaded(true);
    }, 1000);
  }, []);

  function allSounds(action) {
    if (action === "play") {
      if (props.song[props.song.length - 1].state() === "loading") return null;
    }
    setIsPaused(false), props.song.map((track) => track.play());
    if (action === "pause")
      setIsPaused(true), props.song.map((track) => track.pause());
    if (action === "stop")
      setIsPaused(true), props.song.map((track) => track.stop());

    return action;
  }

  return (
    <div className='player'>
      {isLoaded ? (
        <div className='controls'>
          {isPaused ? (
            <div
              className={`player-play button ${isLoaded ? "" : "disabled"}`}
              onClick={() => allSounds("play")}
            >
              {isLoaded ? (
                <span>
                  <FontAwesomeIcon icon={faPlay} />
                </span>
              ) : (
                <span>Loading Track</span>
              )}
            </div>
          ) : (
            <div
              className='player-pause button'
              onClick={() => allSounds("pause")}
            >
              <FontAwesomeIcon icon={faPause} />
            </div>
          )}
          <div className='player-stop button' onClick={() => allSounds("stop")}>
            <FontAwesomeIcon icon={faStop} />
          </div>
        </div>
      ) : (
        <div className='player-loading'>Loading Tracks</div>
      )}

      <div className='player-tracks'>
        {props.song.map((track, index) => (
          <Track key={index} track={{ song: track, key: index }} />
        ))}
      </div>
    </div>
  );
}
