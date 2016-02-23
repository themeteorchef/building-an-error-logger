const authenticatedRoutes = FlowRouter.group( { name: 'authenticated' } );

authenticatedRoutes.route( '/logs', {
  name: 'logs',
  action() {
    BlazeLayout.render( 'default', { yield: 'logs' } );
  }
});
