let setLogScroll = ( type ) => {
  let selector = type ? `.logs.${ type }` : '.logs',
      logs     = document.querySelectorAll( selector );

  for ( let i = 0; i < logs.length; i++ ) {
    let log = logs.item( i );
    log.scrollTop = log.scrollHeight;
  }
};

Template.logs.onCreated( () => {
  // Subscribe to a static application ID. This would be dynamic in a real
  // application, pulled from the user object or elsewhere.
  Template.instance().subscribe( 'logs', '123456789' );
});

Template.logs.onRendered( () => {
  // Set scroll position of logs when the page renders as well as whenever
  // a new item is added to the log.
  setLogScroll();
  Logs.find().observe( { added() { setLogScroll(); } } );
});

Template.logs.helpers({
  logs( type ) {
    let query = type === 'live' ? {} : { type: type },
        logs  = Logs.find( query );

    if ( logs ) {
      return logs;
    }
  }
});

Template.logs.events({
  'shown.bs.tab [data-toggle="tab"]' ( event ) {
    let tab  = event.target.getAttribute( 'aria-controls' ),
        type = tab === 'live-stream' ? '' : type;

    setLogScroll( type );
  }
});
