Meteor.methods({
  insert( object ) {
    check( object, Object );

    try {
      return Documents.insert( object );
    } catch ( exception ) {
      throw new Meteor.Error( '500', `${ exception }` );
    }
  }
});
