Template.header.helpers({
  brandLink() {
    let login = FlowRouter.path( 'login' ),
        logs  = FlowRouter.path( 'logs' );
    return !Meteor.loggingIn() && !Meteor.userId() ? login : logs;
  }
});

Template.header.events({
  'click .logout' ( event ) {
    event.preventDefault();

    Meteor.logout( ( error ) => {
      if ( error ) {
        Bert.alert( error.reason, 'warning' );
      } else {
        Bert.alert( 'Logged out!', 'success' );
      }
    });
  }
});
