import { useState, useEffect } from "react";
import Track from "./Track";
import Setlist from "./Setlist";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faStop } from "@fortawesome/free-solid-svg-icons";

export default function Player(props) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  useEffect(() => {
    setInterval(function () {
      if (props.song[props.song.length - 1].track.state() === "loaded")
        setIsLoaded(true);
    }, 1000);
  });

  function allSounds(action) {
    if (action === "play") {
      if (props.song[props.song.length - 1].track.state() === "loading") {
        return null;
      }
      setIsPaused(false), props.song.map((song) => song.track.play());
    }
    if (action === "pause") {
      setIsPaused(true), props.song.map((song) => song.track.pause());
    }
    if (action === "stop") {
      setIsPaused(true), props.song.map((song) => song.track.stop());
    }

    return action;
  }

  function getSongLength(duration) {
    const minutes = Math.floor(duration / 60);
    const seconds = duration - minutes * 60;

    return minutes + ":" + seconds.toFixed(0);
  }

  return (
    <div className='player'>
      <div className='col-1'>
        <div className='player-tracks'>
          {props.song.map((song, index) => (
            <Track
              key={index}
              track={{ song: song.track, key: index, name: song.name }}
            />
          ))}
        </div>
      </div>
      <div className='col-2'>
        <Setlist />
        {isLoaded ? (
          <div className='controls'>
            <div className='player-buttons'>
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
                  className='player-pause button disabled'
                  onClick={() => allSounds("pause")}
                >
                  <FontAwesomeIcon icon={faPause} />
                </div>
              )}
              <div
                className={`player-stop button ${isPaused ? "disabled" : ""}`}
                onClick={() => allSounds("stop")}
              >
                <FontAwesomeIcon icon={faStop} />
              </div>
            </div>
            <div className='player-length'>
              {"0:00 / " +
                getSongLength(
                  props.song[props.song.length - 1].track.duration()
                )}
            </div>
          </div>
        ) : (
          <div className='player-loading'>Loading Tracks</div>
        )}
      </div>
    </div>
  );
}
