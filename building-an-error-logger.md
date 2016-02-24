<div class="note">
  <h3>Experimental Usage of Meteor 1.3 <i class="fa fa-warning"></i></h3>
  <p>The code for this recipe is based on Meteor 1.3 and <a href="https://github.com/themeteorchef/base/tree/4.0.0">Base v4.0.0</a> (an upcoming release of The Meteor Chef's starter kit) which is currently in beta as of writing. While the code here is stable and works locally, it may be unstable in certain environments. When Meteor 1.3 is officially released, this repository will be updated to the stable version.</p>
</div>

<div class="note">
  <h3>Additional Packages <i class="fa fa-warning"></i></h3>
  <p>This recipe relies on several other packages that come as part of <a href="http://themeteorchef.com/base">Base</a>, the boilerplate kit used here on The Meteor Chef. The packages listed above are merely recipe-specific additions to the packages that are included by default in the kit. Make sure to reference the <a href="http://themeteorchef.com/base/packages-included">Packages Included list</a> for Base to ensure you have fulfilled all of the dependencies.</p>
</div>

<div class="note info">
  <h3>Pre-Written Code <i class="fa fa-info"></i></h3>
  <p><strong>Heads up</strong>: this recipe relies on some code that has been pre-written for you, <a href="https://github.com/themeteorchef/building-an-error-logger">available in the recipe's repository on GitHub</a>. During this recipe, our focus will only be on implementing a logging API, a wrapper for that API, and interface for displaying the log messages sent to that API. If you find yourself asking "we didn't cover that, did we?", make sure to check the source on GitHub.</p>
</div>

### Prep
- **Time**: ~2-3 hours
- **Difficulty**: Intermediate
- **Additional knowledge required**: [ES2015](https://themeteorchef.com/blog/what-is-es2015/) [basics](https://themeteorchef.com/snippets/common-meteor-patterns-in-es2015/), [Server-side routing with Picker](https://themeteorchef.com/snippets/server-side-routing-with-picker/), [Using the HTTP package](https://themeteorchef.com/snippets/using-the-http-package/), [Using Collection2](https://themeteorchef.com/snippets/using-the-collection2-package/)

### What are we building?
ExMachina Robotics is a growing startup based in Switzerland. They're building a line of futuristic refrigerators that can track their own contents, reducing waste and unnecessary purchases at the grocery store. Recently, some of the beta customers of ExMachina's refrigerators have been complaining about their food disappearing unexpectedly. Right now, the ExMachina team has a Meteor-based back-end to track customer information but no clear way of tracking errors with their units.

ExMachina has gotten in touch with us to help them build a custom error logging system. They've asked us to build an interface for reviewing recent log messages as well as a simple JavaScript library for sending new error messages and other data from their WIFI connected refrigerators. Because they already have a significant customer-base for their beta, they've asked that we build the logs so that they automatically delete after a set amount of time.

<iframe width="560" height="315" src="https://www.youtube.com/embed/Of8JOVXYU0Q" frameborder="0" allowfullscreen></iframe>

As a side note, the founder of ExMachina Amélie Heidecker has tipped us off that her engineering team has a sense of humor. A favorite comedy film at the office is [_A Mighty Wind_](https://en.wikipedia.org/wiki/A_Mighty_Wind). Amélie always cracks up at the scene where the failed actor played by Fred Willard talks about his short-lived stint on a show called "Wha' Happened?!" Because the logging system we're building is just for the engineering team, Amélie has asked if we can call it "Hey! Wha' Happened?" as a fun joke for her team. Without question!

<figure>
  <img src="https://tmc-post-content.s3.amazonaws.com/2016-02-24_01:31:30:493_wha-happened-demo.gif" alt="A demo of the logger we'll be building.">
  <figcaption>A demo of the logger we'll be building.</figcaption>
</figure>

### Ingredients
Before we start building, make sure that you've installed the following packages and libraries in your application. We'll use these at different points in the recipe, so it's best to install these now so we have access to them later. **Heads up**: we're relying on Meteor 1.3's ability to install [NPM](https://npmjs.org) packages directly. If you clone the repo for this recipe, make sure to run `npm install` before starting the server.

#### Meteor packages

<p class="block-header">Terminal</p>

```bash
meteor add momentjs:moment
```

We'll rely on the `momentjs:moment` package to give us access to the [Moment](http://momentjs.com) library for parsing dates on each of our log messages.

<p class="block-header">Terminal</p>

```bash
meteor add http
```
We'll use the `http` package to help us write our API wrapper for making calls to our logs ingestion endpoint for receiving errors.

<p class="block-header">Terminal</p>

```bash
meteor add meteorhacks:picker
```
We'll use the `meteorhacks:picker` package to help us set up a server-side route for ingesting new error messages.

<p class="block-header">Terminal</p>

```bash
npm i --save body-parser
```
We'll use the `body-parser` package from NPM to parse the body of POST requests that we receive to our API endpoint.

### Defining a self-expiring Logs collection
Before we get into displaying and ingesting errors via our API, we need a place to store them! To get started, let's set up a new collection with a [schema](https://themeteorchef.com/snippets/using-the-collection2-package/) called `Logs` where we'll store all of our log messages.

<p class="block-header">/collections/logs.js</p>

```javascript
Logs = new Mongo.Collection( 'logs' );

if ( Meteor.isServer ) {
  Logs._ensureIndex( { 'date': 1 }, { expireAfterSeconds: 86400 } );
}

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
```

Let's start at the top. The first line should look pretty familiar. Here, we're defining our collection and setting it to a global variable called `Logs`. Just beneath this, however, is something that may not look too familiar. In MongoDB, a convention exists called indexing which allows us to tell MongoDB specific types of queries that will happen often. An index is a way for MongoDB to more efficiently find documents in our database. If an index is defined, MongoDB has to spend far less time looking in our collection for the document(s) being queried. In turn, our database operations become a lot more efficient.

> Indexes support the efficient execution of queries in MongoDB. Without indexes, MongoDB must perform a collection scan, i.e. scan every document in a collection, to select those documents that match the query statement. If an appropriate index exists for a query, MongoDB can use the index to limit the number of documents it must inspect.
>
> &mdash; via [MongoDB Index Introduction](https://docs.mongodb.org/manual/core/indexes-introduction/)

In order to define indexes on a collection in Meteor, we have to make a call to a special, undocumented method called `_ensureIndex`. While this method works perfectly fine, it is only recognized as a private method—the `_` underscore character prefixing the method name denotes this. In our code here, we're checking to see if this code is being executed on the server (remember, our `collections` directory is exposed to both the client and server). If it is, we make a call to `_ensureIndex` passing in the name of the field we'd like to create an index for.

In this case, we want to create an index on the `date` field. Why? The second argument to `_ensureIndex` explains this. In addition to making queries more efficient, indexes in MongoDB also come with a series of ["index properties"](https://docs.mongodb.org/manual/core/indexes-introduction/#index-properties) which allow us to specify further requirements on our index. Here, because Amélie has requested that our logs are self-deleting, we add an index property called `expireAfterSeconds`—alternatively known as a [TTL index](https://docs.mongodb.org/manual/core/index-ttl/)—and set the value to `86400`, or, 24 hours (one day) in seconds.

Okay...what does this do? Exactly what it says! After one day has passed, MongoDB will automatically remove any documents where the `date` value is greater than `86400` seconds ago. Behind the scenes, MongoDB will run an operation every 60 seconds to see if any documents have expired. This means that, depending on the `date` set for your log item, it will be deleted within 60 seconds of 24 hours _past_ the timestamp. 

To make sure this is clear, if we have a timestamp like `2016-02-24T08:16:15` stored in a document's `date` field, it will only be deleted when MongoDB acknowledges the current time as `2016-02-25T08:16:15` (or within 60 seconds of that time, depending on the current cycle). Make sense? What this means is that we do _not_ have to worry about manually deleting documents. As soon as this condition is met: poof! MongoDB will delete this document for us. **Use this wisely as the deletion is permanent**. 

The reason we use this here is that our log data is decidedly short-lived and wasteful to keep around after a certain amount of time. If you need to retain data for a longer period of time, consider setting a higher `expireAfterSeconds` value, or, not using this feature at all.

#### Setting client-side permissions and our schema
Once we have our index in place to manage automatic deletion of expired log items, next, we make sure to lock down our collection on the client as a security mesaure. Because allow and deny rules are [notoriously error-prone](https://www.discovermeteor.com/blog/allow-deny-challenge-results/), we need to be careful and lock these down. This means that any client-side database operations will be denied. In our case, this is perfectly fine as all of our database operations will take place on the server. Regardless, it is still a good practice to do this—forcing your database operations required on the client to happen through methods.

Next up is our schema. If you've worked with schema's before, most of this should look pretty familiar but let's step through it. The idea here is that we want to limit what types of data can be inserted into our `Logs` collection. Because we're receiving data from a third-party source, we want to be stringent about the type of data we expect. If we look at the structure of our schema here, we're only allowing log items to have the following fields:

- `applicationId` as a `String`
- `date` as a `Date` object
- `type` as a `String` but only `'danger'`, `'warning'`, `'info'`, or `'success'`
- `title` as a `String`
- `message` as a `String`
- `payload` as an `Object` with any child properties

Pay close attention here. The two fields that stand our are `type` and `payload`. For `type`, notice that we're only allowing this field to be set with a value that's present in the `allowedValues` array. If, for example, we passed `'taco'` to this field, our schema would throw an error and prevent the insert from happening. 

For the `payload` field, we do something a bit different. The goal with this field is to allow our users to pass additional data with their error message _if they want to_. To account for this, we set this field to be `optional: true` as it may not always be present in the data we receive. Additionally, because we don't want to set any limitations on what extra data can be passed, we also add a flag of `blackbox: true` to tell our schema to _not_ validate the contents of the `payload` object.

So far so good? Great! We're making solid progress. Next up, let's focus on building out the API endpoint that we'll use to ingest new log items. This will allow us to get data in the system for the following step (building an interface to display log messages).

### Wiring up an endpoint
Because we're building this app custom for ExMachina, the good news is that our API will be really simple. In fact, it will be a single endpoint! Right now, the big concern for Amélie and her team is to simply collect error data and make it easily accessible. To make all of this possible, we're going to rely on the `meteorhacks:picker` package that we installed earlier to create a server-only URL where we can send new log items. Our first step is to skeleton out our server-route and make sure we have access to the `body` of our HTTP request. Let's do it!

<p class="block-header">/server/api.js</p>

```javascript
let bodyParser = require( 'body-parser' );

Picker.middleware( bodyParser.json() );
Picker.middleware( bodyParser.urlencoded( { extended: false } ) );

Picker.route( '/api/v1/logs/ingest', function( params, request, response ) {
  // Handle our request in here.
});
```

Not too much going on here, but what is all of this? Let's start at the bottom. Here, we're creating a new server-only route for our app using Picker. What this means is that in our app, we'll have a URL defined at `http://localhost:3000/api/v1/logs/ingest`. While we can technically access this from the browser—it's just a plain URL, nothing special—when we do, we won't see anything rendered on screen (e.g., a template or header navigation). Instead, our goal here is to simply return a text-based response. 

The reason is that requests to this URL (meaning, someone visits the URL and passed along some data when they visit) will be made by robots, or, other code. The code doesn't need a fancy interface, just some sort of response to its request. For the next few steps, we'll build up the contents of our server-only route being defined here to tell any robot—requester—what type of data we're willing to accept and how we'll return a response. Dont' panic! This may seem a bit overwhelming now, but it will make sense by the time we're done.

Once we have our route set up here, we want to move up to the top where we call `let bodyParser = require( 'body-parser' );`. What is this? Here, we're requiring (or importing) the `body-parser` library that we installed earlier via NPM. If you have a bit of Meteor experience under your belt, this may look odd. As of Meteor 1.3, we no longer need to use hacks like the [`meteorhacks:npm`](https://github.com/meteorhacks/npm) package or [wrapping NPM packages with Meteor packages](https://themeteorchef.com/snippets/using-npm-packages/#tmc-adding-an-npm-package-with-a-meteor-package). Instead, we now get access to Node's native `require()` syntax as part of Meteor core. Hell yeah! 

Translating this, it means that we can now install NPM packages like we did earlier with `npm i --save body-parser` and get access to them in our project with `require()`. Even cooler, if we look in our application's source after running this command, we'll see a new directory called `node_modules` where the source of this package is kept. Neat! No more mystery meat imports.

Once we have access to `body-parser`, we put it to work. Here, `body-parser` is being used to parse the contents of the request we receive to our URL into something we can read in our code. To do this, the Picker package gives us a method called `Picker.middleware()` which allows us to pass a function to pipe the request through _before_ our route is executed. This means that any data that gets passed to our route will be parsed in two ways before we touch it:

1. Picker will use `body-parser` to check if the contents of the request are JSON formatted and set them as `request.body` inside of our route if they are.
2. If Picker detects the contents as being URL encoded, it will pull in the data and assign it as `request.body` inside of our route.

Make sense? Our request will be piped through both of these methods—`bodyParser.json()` and `bodyParser.urlencoded()`—but only one will "catch" and have its results assigned to `request.body` inside of our `Picker.route()`'s callback function. Okay! Enough, set up. Now, we're ready to actually handle our request and get log items inserted into the database.

#### Handling requests
Now that we've wired up parsing of our request body, the next task is to make sure we configure our route's request handling properly. What this means is that whenever a request is made to our route, we want a way to send some rules back to the requester to validate whether or not the request they're making is valid. This is known as an `OPTIONS` request or pre-flight request. Whenever a request is made to our API endpoint, the browser (or server) making the request will first send a "hey is this allowed?" message in the form of an `OPTIONS` request to our server.

It's our responsibility to acknowledge this request before anything else and then send back a response with the information that's allowed. To do this for our route, we're going to set up a new JavaScript module in our server at `/server/modules/ingest-log-item.js` and take advantage of Meteor's new ES2015 import/export support. Let's set up that file now and build out our method and then talk through getting it exported and imported.

<p class="block-header">/server/modules/ingest-log-item.js</p>

```javascript
const _handlePreflight = ( response ) => {
  response.setHeader( 'Access-Control-Allow-Origin', '*' );
  response.setHeader( 'Access-Control-Allow-Headers', 'Content-Type, Accept, X-Application-ID' );
  response.setHeader( 'Access-Control-Allow-Methods', 'OPTIONS, POST' );
  response.setHeader( 'Content-Type', 'text/plain' );
  response.end( 'Handle OPTIONS preflight.' );
};

export const handlePreflight = _handlePreflight;
```

Here, we define a method that we'll call from within our route called `_handlePreflight`. Inside, we take in the `request` value from our route and set a few things on it. What we're saying here is that we're allowing requests from any origin (meaning you can send log items from any other URL), what [HTTP Headers](https://en.wikipedia.org/wiki/List_of_HTTP_header_fields) are accepted, what [HTTP Methods](https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol#Request_methods) are accepted, and finally, what type of content we'll be responding with. 

At the very end, we signify the end of our response with a little text message (this is non-specific and could read anything like "Handle gobiltygoop." and still work). As it stands, this is currently "stuck" in our `ingest-log-item.js` file. To make use of it, we need to `export` it from our file so that we can `import` in another file. To do that, here, we say—at the bottom of our file—`export const handlePreflight = _handlePreflight`. What this is saying is that when someone imports this file, they will be able to access our `_handlePreflight` method as the variable `handlePreflight`. What? Let's see how importing works to make sense of this.

<p class="block-header">/server/api.js</p>

```javascript
import { handlePreflight } from './modules/ingest-log-item';

[...]

Picker.route( '/api/v1/logs/ingest', function( params, request, response ) {
  if ( request.method === 'OPTIONS' ) {
    handlePreflight( response );
  } else {
    // Handle non-OPTIONS requests here.
  }
});
```

Importing a file is super-easy in Meteor 1.3. To do it, we use the [ES2015 Import](http://exploringjs.com/es6/ch_modules.html) syntax, specifying the name of the export we'd like to import in brackets `{ handlePreflight }` and `from` what file that export will be coming from `./modules/ingest-log-item`. A few things to note. Here, the path to the file we're importing is _relative_ to the current file. Because we're in the `server` directory, we can call `./` to say "from `/server` import the `ingest-log-item` file in the `modules` directory." What's neat about this is that we're only importing the code we need from this file and nothing else. This means that our code ultimately becomes more efficient and predictable! As a bonus, notice that `.js` is inferred as a file type so we needn't pass it.

To make use of the method we imported—remember, `handlePreflight` here maps to our `_handlePreflight` method in our module file—we just call it! Down in our route, we make a quick check to ensure that the `request.method` value being used is `OPTIONS` (signifying a pre-flight request) and then make a call to `handlePreflight` passing in our `response` method from our route. That's it! Now, this code will be run along with our series of `.setHeader()` calls and let the request know what is allowed. _Really cool_.

Now we're cruising! Let's add some more methods to our module file and keep making use of `import` to get our route wired up.

<p class="block-header">/server/modules/ingest-log-item.js</p>

```javascript
[...]

const _authenticateRequest = ( token ) => {
  return token === '123456789';
};

const _handleResponse = ( response, code, message ) => {
  response.statusCode = code;
  response.end( message );
};

export const handlePreflight = _handlePreflight;
export const authenticate    = _authenticateRequest;
export const respond         = _handleResponse;
```

Same train of thought as before: define a method and export it down below. As far as what we're doing here, the first additional method we're defining is `_authenticateRequest` which is...a bit cheesy right now. Because we don't have to worry about other users accessing this API endpoint later, we're authenticating any request that has its `X-Application-ID` header value set as `123456789`. Secure! It's funny here, but if you adapt this in your own application, make sure to update this method to actually check the passed token—we'll see how this is passed in next—as a legitimate, stored value. Otherwise: uh oh.

Once we've authenticated the request, we add another method called `_handleResponse`. Any guess what this does? Yep! This is what ultimately will respond to requests that are _not_ using the `OPTIONS` method. Here, we bake the response process into a reusable method as we'll be responding in a few different ways—positively and negatively—in our code. With this set up, let's jump back to our route and see how this is used.

<p class="block-header">/server/api.js</p>

```javascript
import {
  handlePreflight,
  authenticate,
  respond
} from './modules/ingest-log-item';

[...]

Picker.route( '/api/v1/logs/ingest', function( params, request, response ) {
  if ( request.method === 'OPTIONS' ) {
    handlePreflight( response );
  } else {
    let applicationId = request.headers[ 'x-application-id' ];

    if ( !applicationId || !authenticate( applicationId ) ) {
      respond( response, 403, '[403] Invalid Application ID.' );
    }
  }
});
```

See how this is working? With our `import` already set up, all we need to do is add the additional methods to import and then we can call them. Down in our route, we grab the `x-application-id` from the request headers we received (we expect each request made to our endpoint to pass this here). With that, we make a quick check to ensure that it's defined and then make a call to our `authenticate()` method to check that the value we received matches our super high-tech authentication (read: is the value `123456789`).

If all is well, our request will continue onward. If the authentication fails, though, we make use of our `respond()` method, passing in our `response` method, the error code—a `403` forbidden—and an error message to send back to the requesting application. Boom! Moving right along. At this point, our request is getting its `OPTIONS` handled—that sounds dirty—and its application ID authenticated. Last step of this: logging the actual item. Let's add in all of the additional methods now and then wire it up back here in our route.

<p class="block-header">/server/modules/ingest-log-item.js</p>

```javascript
[...]

const _verifyItemContents = ( item ) => {
  return Match.test( item, {
    applicationId: String,
    type: Match.OneOf( 'danger', 'warning', 'info', 'success' ),
    date: String,
    title: String,
    message: String,
    payload: Match.Optional( Object )
  });
};

const _ingestLogItem = ( item ) => {
  return Logs.insert( item );
};

[...]

export const verify = _verifyItemContents;
export const ingest = _ingestLogItem;
```

Two methods being added. The first, `_verifyItemContents` is designed to check the log item passed to our API to ensure it has only the properties we expect and that they're assigned the appropriate types. This is very similar to Meteor's [check package](https://themeteorchef.com/snippets/using-the-check-package/), with the main difference being that `Match.test()` simply returns a boolean `true` or `false` response, while `check()` throws an error. We don't want to throw an error, here, so we rely on `Match.test()` to give us a thumbs up or down on the passed item.

Our final method for this file `_ingestLogItem` is a bit less cryptic: it just inserts the item! We simply wrap the call here to give our module a bit more structure. Alternatively, you could just call this directly in the route. This is our final step to get our endpoint ready: wire it up in our route.

<p class="block-header">/server/api.js</p>

```javascript
import {
  handlePreflight,
  authenticate,
  respond,
  verify,
  ingest
} from './modules/ingest-log-item';

[...]

Picker.route( '/api/v1/logs/ingest', function( params, request, response ) {
  if ( request.method === 'OPTIONS' ) {
    handlePreflight( response );
  } else {
    let applicationId = request.headers[ 'x-application-id' ];

    if ( !applicationId || !authenticate( applicationId ) ) {
      respond( response, 403, '[403] Invalid Application ID.' );
    }
    
    let body = request.body;
    body.applicationId = applicationId;

    if ( body && verify( body ) ) {
      ingest( body );
      respond( response, 200, '[200] Log item received!' );
    } else {
      respond( response, 403, '[403] Invalid log item. Check your parameters.' );
    }
  }
});
```

This should look pretty familiar at this point. Up top, we make sure to import our additional methods and then make use of them down below. First, we take the `applicationId` variable we assigned earlier (from the request's HTTP headers) and reassign it to our `request.body` value. Remember, our `verify()` method is expecting this as part of the item, even though we pass it as a header.

Just beneath this, we make sure that `body` exists and that our `verify()` method returns `true`. If all is well, we call our `ingest()` method—insert—passing in our `body` value and send back a `200` "all is okay" response. If something is wrong with our log item, we throw a `403` error to let the requester know the item is invalid. 

Done! At this point we've just knocked off a huge chunk of work. We now have an endpoint to send data to which in turn stores the data in our `Logs` collection. With this in place, our next step is to get that interface wired up for Amélie and her engineers. Let's keep moving!

### Building our logger's interface
Our interface is pretty simple. We need to create five "bins" to display our errors in:

1. A live stream bin that shows the latest messages of _all_ message types, displayed in chronological order.
2. An errors bin that only shows messages of the `error` type.
3. A warnings bin that only shows messages of the `warning` type.
4. An info bin that only shows messages of the `info` type.
5. A success bin that only shows messages of the `success` type.

There's quite a bit of repetition here, so let's spit out the markup we'll use and then step through the JavaScript that's making it all work.

<p class="block-header">/client/templates/authenticated/logs.html</p>

```markup
<template name="logs">
  <ul class="nav nav-tabs" role="tablist">
    <li role="presentation" class="active">
      <a href="#live-stream" aria-controls="live-stream" role="tab" data-toggle="tab">
        <i class="fa fa-refresh fa-spin"></i> Live Stream
      </a>
    </li>
    <li role="presentation"><a href="#errors" aria-controls="errors" role="tab" data-toggle="tab">Errors</a></li>
    <li role="presentation"><a href="#warnings" aria-controls="warnings" role="tab" data-toggle="tab">Warnings</a></li>
    <li role="presentation"><a href="#info" aria-controls="info" role="tab" data-toggle="tab">Info</a></li>
    <li role="presentation"><a href="#success" aria-controls="success" role="tab" data-toggle="tab">Success</a></li>
  </ul>

  <div class="tab-content">
    <div role="tabpanel" class="tab-pane active" id="live-stream">
      <div class="logs live">
        {{#each logs 'live'}}
          {{> logItem}}
        {{else}}
          <p class="alert alert-warning">Nothing logged recently. Awesome!</p>
        {{/each}}
      </div>
    </div>
    <div role="tabpanel" class="tab-pane" id="errors">
      <div class="logs danger">
        {{#each logs 'danger'}}
          {{> logItem}}
        {{else}}
          <p class="alert alert-warning">Nothing logged recently. Awesome!</p>
        {{/each}}
      </div>
    </div>
    <div role="tabpanel" class="tab-pane" id="warnings">
      <div class="logs warning">
        {{#each logs 'warning'}}
          {{> logItem}}
        {{else}}
          <p class="alert alert-warning">Nothing logged recently. Awesome!</p>
        {{/each}}
      </div>
    </div>
    <div role="tabpanel" class="tab-pane" id="info">
      <div class="logs info">
        {{#each logs 'info'}}
          {{> logItem}}
        {{else}}
          <p class="alert alert-warning">Nothing logged recently. Awesome!</p>
        {{/each}}
      </div>
    </div>
    <div role="tabpanel" class="tab-pane" id="success">
      <div class="logs success">
        {{#each logs 'success'}}
          {{> logItem}}
        {{else}}
          <p class="alert alert-warning">Nothing logged recently. Awesome!</p>
        {{/each}}
      </div>
    </div>
  </div>
</template>
```

This may seem like a lot at first glance, but look close. This is just a lot of repetition for each of our different content types, nothing else. Here, we're making use of [Bootstrap's tab interface](http://getbootstrap.com/javascript/#tabs). For each of the different types we need to support, we're adding a tab and a complimentary `.tabpanel` that will toggle between each list.

The part to zoom in on is the `{{#each logs}}` block in each of the panels. Notice that each one passes the type of data we want as a string.

```javascript
{{#each logs 'live'}}
  {{> logItem}}
{{else}}
  <p class="alert alert-warning">Nothing logged recently. Awesome!</p>
{{/each}}
```

Inside, we're passing a template called `logItem` which will render our actual log item. Before we look at that, let's wire up the `logs` helper and friends for each of our lists and then look at how each item works.

#### Wiring up our logs
Okay, first step is to get some data piping into each of our lists. To do that, we need to set up three things: a publication, subscription, and our `logs()` helper. Let's get that publication wired up on the server quick and then put it to use.

<p class="block-header">/server/publications/logs.js</p>

```javascript
Meteor.publish( 'logs', function( applicationId ) {
  check( applicationId, String );
  return Logs.find( { applicationId: applicationId }, { sort: { date: 1 } } );
});
```

Simple enough. Here, we take in an `applicationId`—remember, this is just a static `123456789` right now but will be dynamic in a multi-user app—and check that it's a `String`. If it is, we pass it to a query to our `Logs` collection, along with a [projection](https://themeteorchef.com/snippets/mongodb-queries-and-projections/#tmc-the-mongodb-projection-document) that says we want our results back sorted by the `date` field in chronological order. Easy enough! Back to the client to tap into this.

<p class="block-header">/client/templates/authenticated/logs.js</p>

```javascript
Template.logs.onCreated( () => {
  Template.instance().subscribe( 'logs', '123456789' );
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
```

See how this is working? Up top we add a subscription to our freshly minted `logs` publication, passing in our top secret `1234556789` string as our application ID. Once we have the data, down in our template's `helpers` method, we create our `logs()` method, taking in the `type` we passed in our HTML. Inside, we do something special. Remember, we're trying to filter down the data we're getting by its `type`. Here, before we call `.find()` on our `Logs` collection, we check if our `type` value is `'live'`. If it is, we know that we want to return _all_ messages.

If the type is anything other than live, we want to filter by that type. Once we have our `query` sorted out, we pass it to our `Logs.find()` call and then return the result from our helper if we get something back. Easy enough! Now our data is piping into our template. This is good, but we can add a little polish to this process.

#### The bottom is the top
While this next part is entirely optional—feel free to skip ahead!—because we're building a logger, we want to show the latest log messages _first_. As a common convention for logs, the newest messages are generally at the bottom of the window, with older messages appearing above. Real quick, what we want to do is make it so that when one of the following happens, we "scroll" to the bottom of our messages list in the selected tab:

1. The `logs` template renders.
2. We change to a different tab displaying a different list.
3. Our log has new items added.

To get this working, let's set up a method that we can call when each of these "events" happens to avoid duplicating code.

<p class="block-header">/client/templates/authenticated/logs.js</p>

```javascript
let setLogScroll = ( type ) => {
  let selector = type ? `.logs.${ type }` : '.logs',
      logs     = document.querySelectorAll( selector );

  for ( let i = 0; i < logs.length; i++ ) {
    let log = logs.item( i );
    log.scrollTop = log.scrollHeight;
  }
};
```

What the heck?! According to the Consortium of Übernerds, selecting the DOM with jQuery is now considered a punishable offense. Fair enough. As JavaScript continues to evolve, tools like jQuery that helped us to keep APIs consistent and cross-browser are becoming less and less needed. For our needs, we can use some native JavaScript to select each of our log containers and manipulate them as required.

Here, we're using a similar trick as we did for the "dynamic" query we passed to our collection above. Here, if our `setLogScroll` function is passed a `type` parameter, we want to add it to the classes that we're looking for in our DOM. If we don't get a type, we simply want to grab any element with a `.logs` class.

Down below, we do our own version of jQuery's `.each()` to loop over the DOM elements we found matching the classes we passed to `document.querySelectorAll()` (this is analogous to `$( '.logs' )` in jQuery). For each element found, we want to assign its `scrollTop` equal to its own `scrollHeight`. In other words, set the scroll position to the bottom-most position. Make sense? Cool. Now, let's wire up some calls to this when things happen in our tmeplate.

<p class="block-header">/client/templates/authenticated/logs.js</p>

```javascript
Template.logs.onRendered( () => {
  setLogScroll();
  Logs.find().observe( { added() { setLogScroll(); } } );
});
```

In our `logs` template's `onRendered()` callback, we make a call to `setLogScroll()` when our template first renders. Additionally, we add a call to Meteor's `.observe()` method which watches for changes on a MongoDB cursor. In this case we're calling our `setLogScroll()` method when _any_ type of log item is added to the `Logs` collection. As soon as that happens, our `setLogScroll()` will fire and the list will reveal the most recent message.

So far so good? Let's keep moving. Next up is that `logItem` template that we're outputting inside of each of our log lists. Let's see the HTML and then see how it's wired up in JavaScript.

<p class="block-header">/client/templates/authenticated/log-item.html</p>

```javascript
<template name="logItem">
  <div class="panel panel-{{type}}">
    <div class="panel-heading clearfix">
      <strong class="pull-left"><i class="fa fa-{{icon type}}"></i> {{title}}</strong>
      <p class="pull-right">{{humanDate date}}</p>
    </div>
    <div class="panel-body">
      <pre><code>{{message}}</code></pre>

      {{#if hasPayload payload}}
        <div class="table-responsive">
          <table class="table table-bordered payload">
            <tbody>
              {{#each payloadItems payload}}
                <tr>
                  <th width="20%">{{property}}</th>
                  <td>{{value}}</td>
                </tr>
              {{/each}}
            </tbody>
          </table>
        </div>
      {{/if}}
    </div>
  </div>
</template>
```

Pretty simple here. For each of our log items, we're outputting a [Bootstrap panel](http://getbootstrap.com/components/#panels) element, relying on its [contextual classes](http://getbootstrap.com/components/#panels-alternatives) feature to pair a color with each of our message types. As we defined earlier, the `type` field on each of our message can be one of four classes `'danger'`, `'warning'`, `'info'`, or `'success'`. Each of these types maps to a class in Bootstrap. In our template here, we piggyback on this by calling `panel-{{type}}`. Nice!

Down below we start to output or data, using a series of helpers to get it all displayed nicely. Let's look at those now. As you're reading, jump back to this markup to understand how everything is pairing up.

<p class="block-header">/client/templates/authenticated/log-item.js</p>

```javascript
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
```

Let's move top to bottom. Up top, our `icon()` helper here is pretty simple. What we're doing here is taking in the passed `type` value to the helper and then assigning its value to an icon name in the [FontAwesome](http://fontawesome.io) library. When this gets called, the appropriate class will be returned matching the passed `type` value. Easy peasy!

Next up is the `humanDate()` helper which is working in a similar principle. Here, we take in the log item's passed `timestamp` and format it using the `momentjs:moment` package that we installed earlier. We do this in two stages here so that we can create a string concatenating the values together with an ` at ` label. We grab the month, day, and year the item was logged first and assign it to the `date` variable and then do the same with the hours, minutes, seconds, and the meridiem type (after meridiem, AM, or post meridiem, PM).

Next we get into some of our optional features. First, we need to check if the passed item was sent with a `payload` value. Remember, this is the optional objet of extra data to add context to the log item. Here, we check that the `payload` value being passed actually has items in the object (meaning, it's not just an empty object). If it has items, we return `true`. Otherwise, we return `false`, preventing an unnecessary rendering of our payload table markup.

Last but not least is something pretty cool: parsing our payload items. Because our payload object can contain _anything_, we can't just loop over it in our template and call to specific values. Instead, here, we have to first take in the payload object and loop over that, assigning each of its keys (and their respective values) to a new object and then push them into an array. We do that here, returning an array of objects with the name of the property and the value for that property. Dynamic! Now no matter what our users passes, we'll grab each property and output it as a new row in our payload table.

Sweet! At this point our interface is all wired up. We can now take in log items and render them to our app. Technically we're done here, but to make this really useful, we have one last step: writing a wrapper for our API endpoint. 

### Writing an API wrapper
Phew! We've covered a lot of ground. The last step is technically optional, but will make all of this super useful for the team ExMachina. Right now, the only way to interact with our logger is to make an HTTP POST request to it. That's fine, but to make this all easier to use we can write a wrapper around this request to make it much easier to call. So it's clear, what we're after is the ability for Amélie's team to use something like this in their code:

```javascript
WhaHappened.error({
  title: 'This is the error that happened.',
  message: 'An additional message to describe the error that happened.',
  payload: {
    line: '25',
    file: '/server/example.js'
  }
});
```

Behind the scenes, we'll handle this call and pass it over to our API. While we'll be developing the code to do this _within_ our app here, technically speaking, this code will be designed to be run from another application's code. It will work just fine for testing in the logger app, but keep in mind that ExMachina will load this into the Meteor app that's powering each of their refrigerator's. With that in mind, let's get this thing built so we can use it! To make this easy on us, we're going to rely on ES2015 classes to build our wrapper.

<p class="block-header">/server/api-wrapper.js</p>

```javascript
let Future = require( 'fibers/future' );

class WhaHappenedAPI {
  constructor() {
    this.appId = Meteor.settings.private.whaHappened;
  }
}

WhaHappened = new WhaHappenedAPI();
```

Starting with a skeleton. Here, we kick off our file by making a call to `require( 'fubers/future' )` to get access to the `Future` library. We'll use this in a little bit to improve our work with making HTTP requests. Just below this, we create a new ES2015 calls called `WhaHappenedAPI` and give it a `constructor()` function. Because this is all being purpose built, we don't need a bunch of configuration here. All we're doing is assigning `appId` within our class—using `this.appId`—to a value in our [settings.json](https://themeteorchef.com/snippets/making-use-of-settings-json/) file. This is optional. Because we're using a static value for `appId`, we could write this as `this.appId = '123456789'` and be on our way. Up to you!

Next, let's add in a method for making our `request()`. To do this, we'll be relying on the `http` package we installed earlier.

<p class="block-header">/server/api-wrapper.js</p>

```javascript
let Future = require( 'fibers/future' );

class WhaHappenedAPI {
  [...]
  
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
}

WhaHappened = new WhaHappenedAPI();
```

[Using the HTTP package](https://themeteorchef.com/snippets/using-the-http-package), we define a call to a `POST` method—remember, this the only type of request we need to support right now—and pass it the `url` for our endpoint. In the third argument, we pass an object with parameters for our request. For the `headers` field, we pass a value `x-application-id` containing the value we set up above for `this.appId`. For the `body`—the HTTP package calls this `data`—of our HTTP request, we simply pass in `options` which will contain the log item that gets passed in when we make a call like `WhaHappened.error( { /* this stuff */ } );`.

In the fourth argument position, we pass a callback function but do something unique. This takes a bit of explaining. By default, the `HTTP.call()` method is asynchronous meaning once it is called it _does not_ wait for a response. While this isn't entirely prohibitive here—we don't need to do anything after the request is made—it's still nice to know that the request went through without issue. While the HTTP package _does_ allow you to make calls synchronously by omitting the callback function, as of writing, the implementation is currently broken in respect to error handling (the error message comes back in a difficult to parse format).

To get around this, we can mimic the function of the synchronous version by relying on a [Future](https://themeteorchef.com/snippets/synchronous-methods/#tmc-using-futures). A future simply allows us to take an asynchronous callback function and make it behave in a more synchronous fashion (we can also achieve this with [ES2015 Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) if we'd like).

By creating a new instance of our `Future` library we `required()` up top—no need to `npm install` this as it's already exposed via Meteor's internals—we gain a set of methods: `throw()`, `return()`, and `wait()`. Near the bottom of our `request()` class method here, we make a call to `handleRequest.wait()` which is saying "wait until our `Future` receive's a value before returning." In other words, work synchronously!

In our callback function, instead of simply returing the `error` or `response` from our API call, we pass that `error` or `response` value to `handleRequest.throw()` or `handleRequest.return()` (respectively) to get it back to our `handleRequest.wait()` method. In other words, if an error occurs that will be returned from our classes `request()` method, otherwise the response will be returned. Easy peasy!

This was the difficult part. Next, we need to add a method for each of the log types we'd like to support. This will be easy as it's mostly repetition.

<p class="block-header">/server/api-wrapper.js</p>

```javascript
let Future = require( 'fibers/future' );

class WhaHappenedAPI {
  [...]

  request( options ) {
    [...]
  }

  timestamp() {
    let ISOString = ( new Date() ).toISOString();
    return new Date( ISOString );
  }

  error( options ) {
    options.type = 'danger';
    options.date = this.timestamp();
    return this.request( options );
  }
}

WhaHappened = new WhaHappenedAPI();
```

See what's up? Here, we're defining a new method called `error()` which will be accessible from our global `WhaHappened` variable down below (notice that we're assigning this variable to an instance of our class with `new WhaHappenedAPI()`). Inside of our method we do three things:

1. Set the passed `options` value's `type` property equal to the type of log item we want to log (one of the `allowedValues` in our schema).
2. Set a timestamp on the passed `options` value's `date` property equal to when the method was called (when the log event happened).
3. `return` a call to `this.request()` to make our request, passing in our completed `options` object along.

Here, then, our `error()` method is just an alias for logging a `danger` alert in our logger. For our `date` value, notice that we're first taking the current `Date()` and getting it back as an [ISO 8601 string]() and then converting _that_ result back into a `Date()` object. Why's that? This is so that our `expireAfterSeconds` index we set up on our collection earlier behaves as expected. That index method is expecting a `Date()` object, calculated against UTC time. Here, we simply conver the data before applying it so that MongoDB reads it properly and executes our expiration at the appropriate time.

This is it for our methods! One little thing, though, we'll want to replicate this for each of our log types. Extending our work:

<p class="block-header">/server/api-wrapper.js</p>

```javascript
let Future = require( 'fibers/future' );

class WhaHappenedAPI {
  [...]

  request( options ) {
    [...]
  }

  timestamp() {
    let ISOString = ( new Date() ).toISOString();
    return new Date( ISOString );
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
}

WhaHappened = new WhaHappenedAPI();
```

Nice! Now we support each of the log types as an easy to access method. Here's the final list:

- `WhaHappened.error()` = danger item
- `WhaHappened.warning()` = warning item
- `WhaHappened.info()` = info item
- `WhaHappened.success()` = success item

Great. We're _almost_ done. Technically right now, we're only handling errors that the ExMachina team _tells us about_. This is fine for most cases, but we also want to account for unexpected server errors. Let's add a little treat into our class here to really help the ExMachina team out.

<p class="block-header">/server/api-wrapper.js</p>

```javascript
let Future = require( 'fibers/future' );

class WhaHappenedAPI {
  [...]

  request( options ) { [...] }

  timestamp() { [...] }

  error( options ) { [...] }
  
  warning( options ) { [...] }

  info( options ) { [...] }

  success( options ) { [...] }
  
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
```

Clever beagles, aren't we? See what this is doing. In addition to being able to send log messages directly to our API, here, we define `watch()` method which _also_ enables the ExMachina team to catch errors they didn't expect. Piggybacking on Node's (remember, Node is what Meteor runs on top of) `process.on( 'uncaughtException' )` method, we can actively watch for errors and pass them to our API. This means that if something happens that wasn't planned for, the error will still make it back to our logger! How cool is that?

To make this work, we need to wrap the callback function passed to `process.on()` in a call to `Meteor.bindEnvironment()`. Because the code we're calling inside of this callback function is specific to the main Meteor application thread, we need to ensure that we still have access to that thread. Using `Meteor.bindEnvironment()`, we keep that connection intact—without this we'd get an error from Meteor.

Cool! At this point, we can call each of these methods directly and get our errors sent over to our API. For our final `.watch()` method here, we just need to call this when the server starts up and Node will take over form there. Something like this will do the trick:

<p class="block-header">/server/startup.js</p>

```javascript
Meteor.startup( () => {
  WhaHappened.watch();
});
```

Done! We've officially completed a robust error logging system for ExMachina. Let's give Amélie a call to let her know we're ready for a demo.

### Wrap up & summary
In this recipe, we learned how to build a custom error logging system. We learned about using MongoDB indexes to automatically delete content, as well as how to wire up an API that automates inserting new data into a collection. We also learned how to wire up an API wrapper to make calls to our API endpoint effortless for other developers. To wrap everything up in a neat little bow, we built a user interface for viewing our log in real-time, levearing Meteor's reactivity to bring it all together.