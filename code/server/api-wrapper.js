// Note: this is intended to be run from another application, but is included
// here as part of the recipe source.

let Future = require( 'fibers/future' );

class WhaHappenedAPI {
  constructor() {
    this.appId = Meteor.settings.private.whaHappened;
  }

  request( options ) {
    let handleRequest = new Future(),
        url           = 'http://localhost:3000/api/v1/logs/ingest';

    HTTP.call( 'POST', url, {
      headers: { 'x-application-id': this.appId },
      data: options
    }, ( error, response ) => {
      if ( error ) {
        handleRequest.throw( error );
      } else {
        handleRequest.return( response );
      }
    });

    return handleRequest.wait();
  }

  timestamp() {
    return new Date();
  }

  error( options ) {
    options.type = 'danger';
    options.date = this.timestamp();
    return this.request( options );
  }

  warning( options ) {
    options.type = 'warning';
    options.date = this.timestamp();
    return this.request( options );
  }

  info( options ) {
    options.type = 'info';
    options.date = this.timestamp();
    return this.request( options );
  }

  success( options ) {
    options.type = 'success';
    options.date = this.timestamp();
    return this.request( options );
  }

  watch() {
    process.on( 'uncaughtException', Meteor.bindEnvironment( ( error ) => {
      return this.request({
        type: 'danger',
        title: '[500] Internal Server Error',
        message: error.message,
        date: this.timestamp(),
        payload: {
          stack: `${ error.stack }`
        }
      });
    }));
  }
}

WhaHappened = new WhaHappenedAPI();
