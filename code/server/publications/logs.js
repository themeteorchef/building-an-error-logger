Meteor.publish( 'logs', function( applicationId ) {
  check( applicationId, String );
  return Logs.find( { applicationId: applicationId }, { sort: { date: 1 } } );
});
