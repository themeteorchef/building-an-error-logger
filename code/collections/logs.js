Logs = new Mongo.Collection( 'logs' );

Logs._ensureIndex( { "date": 1 }, { expireAfterSeconds: 60 } );

Logs.allow({
  insert: () => false,
  update: () => false,
  remove: () => false
});

Logs.deny({
  insert: () => true,
  update: () => true,
  remove: () => true
});

let LogsSchema = new SimpleSchema({
  'applicationId': {
    type: String,
    label: 'The ID of the application this log item belongs to.'
  },
  'date': {
    type: Date,
    label: 'The date and time when this log item occurred.'
  },
  'type': {
    type: String,
    allowedValues: [ 'danger', 'warning', 'info', 'success' ],
    label: 'The type of this log message.'
  },
  'title': {
    type: String,
    label: 'The title of this log message.'
  },
  'message': {
    type: String,
    label: 'The contents of this log message.'
  },
  'payload': {
    type: Object,
    label: 'Additional content passed with the log message.',
    optional: true,
    blackbox: true
  }
});

Logs.attachSchema( LogsSchema );
