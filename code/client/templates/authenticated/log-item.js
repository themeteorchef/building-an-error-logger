Template.logItem.helpers({
  icon( type ) {
    return {
      'danger': 'remove',
      'warning': 'warning',
      'info': 'info',
      'success': 'check'
    }[ type ];
  },
  humanDate( timestamp ) {
    let dateAsMoment = moment( timestamp ),
        date         = dateAsMoment.format( 'MMMM Do, YYYY' ),
        time         = dateAsMoment.format( 'hh:mm:ss a' );

    return `${ date } at ${ time }`;
  },
  hasPayload( payload ) {
    if ( payload ) {
      return Object.keys( payload ).length;
    }
  },
  payloadItems( payload ) {
    let items = [];

    for( let property in payload ) {
      items.push( { property: property, value: payload[ property ] } );
    }

    if ( items.length > 0 ) {
      return items;
    }
  }
});
