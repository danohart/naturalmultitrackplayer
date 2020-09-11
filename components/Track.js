import { useState } from "react";

export default function Mute(props) {
  const [isUnmuted, setIsUnmuted] = useState(true);

  function muteTrack(song) {
    setIsUnmuted(!isUnmuted);
    song.mute(isUnmuted);
  }

  return (
    <div className={`player-track`}>
      <div className='player-track-name'>Track {props.track.key}</div>
      <div
        className={isUnmuted ? "mute" : "mute muted"}
        onClick={() => muteTrack(props.track.song)}
      >
        Mute
      </div>
    </div>
  );
}
