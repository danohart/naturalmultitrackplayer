import { useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";

export default function Mute(props) {
  const [isUnmuted, setIsUnmuted] = useState(true);
  const [volume, setVolume] = useState(1.0);

  function muteTrack(song) {
    setIsUnmuted(!isUnmuted);
    song.mute(isUnmuted);
  }

  const minVolume = 0.0;
  const maxVolume = 1.0;

  function minusVolume(song) {
    setVolume(Math.min(Math.max(Number(volume - 0.1), minVolume), maxVolume));
    song.volume(volume);
  }

  function plusVolume(song) {
    setVolume(Math.min(Math.max(Number(volume + 0.1), minVolume), maxVolume));
    song.volume(volume);
  }

  function getVolume() {
    return (
      <div
        className='player-track-volume'
        style={{
          background: `linear-gradient(to top, #1b294c ${
            Math.round((volume / maxVolume) * 100) + "%"
          }, transparent 0%)`,
        }}
      >
        <div
          className='player-track-volume-control'
          onClick={() => plusVolume(props.track.song)}
        >
          <FontAwesomeIcon icon={faPlus} />
        </div>
        <div className='player-track-volume-description'>
          Vol:{" "}
          {!isUnmuted ? "0%" : Math.round((volume / maxVolume) * 100) + "%"}
        </div>

        <div
          className='player-track-volume-control'
          onClick={() => minusVolume(props.track.song)}
        >
          <FontAwesomeIcon icon={faMinus} />
        </div>
      </div>
    );
  }

  return (
    <div className={`player-track ${!isUnmuted ? "muted" : ""}`}>
      {getVolume()}
      <div className='player-track-name'>{props.track.name}</div>
      <div
        className={isUnmuted ? "mute" : "mute muted"}
        onClick={() => muteTrack(props.track.song)}
      >
        {isUnmuted ? "On" : "Off"}
      </div>
    </div>
  );
}
