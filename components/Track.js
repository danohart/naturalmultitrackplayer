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

  return (
    <div className={`player-track`}>
      <div className='player-track-name'>Track {props.track.key + 1}</div>
      <div className='player-track-volume'>
        <div onClick={() => minusVolume(props.track.song)}>
          <FontAwesomeIcon icon={faMinus} />
        </div>
        <div>Vol</div>
        <div onClick={() => plusVolume(props.track.song)}>
          <FontAwesomeIcon icon={faPlus} />
        </div>
      </div>
      <div
        className={isUnmuted ? "mute" : "mute muted"}
        onClick={() => muteTrack(props.track.song)}
      >
        Mute
      </div>
    </div>
  );
}
