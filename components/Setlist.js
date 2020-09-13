export default function Setlist() {
  return (
    <div className='setlist'>
      <h2 className='setlist-title'>Setlist</h2>
      <div className='setlist-list'>
        <div className='setlist-song selected'>
          <div className='setlist-song-title'>Song 1</div>
          <div className='setlist-song-subtitle'>BPM: 110 - Key: G</div>
        </div>
        <div className='setlist-song'>Song 2</div>
        <div className='setlist-song'>Song 3</div>
      </div>
    </div>
  );
}
