import setBrowserPolicies from './modules/set-browser-policies';
import seedDatabase from './modules/seed-database';

Meteor.startup( () => {
  setBrowserPolicies();
  seedDatabase();

  // Just for demo purposes. You can remove this :)
  Meteor.setInterval( () => {
    WhaHappened.error({
      title: 'I don\'t think so!',
      message: 'This is just a test message that\'s automatically being inserted every 30 seconds. You can delete me at the line and file noted below.',
      payload: {
        line: '9-16',
        file: '/server/startup.js'
      }
    });
  }, 30000 );
});
