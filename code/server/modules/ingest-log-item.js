const _handlePreflight = ( method, response ) => {
  response.setHeader( 'Access-Control-Allow-Origin', '*' );

  if ( method === 'OPTIONS' ) {
    response.setHeader( 'Access-Control-Allow-Headers', 'Content-Type, Accept, X-API-Key' );
    response.setHeader( 'Access-Control-Allow-Methods', 'OPTIONS, POST' );
    response.end( 'Handle OPTIONS preflight.' );
  }
};

const _authenticateRequest = ( token ) => {
  // Simplified for the recipe. This can (and should) include a randomly generated
  // API token that the user can pass securely (and regenerate).
  return token === '123456789';
};

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

const _handleResponse = ( response, code, message ) => {
  response.setHeader( 'Content-Type', 'text/plain' );
  response.statusCode = code;
  response.end( message );
};

const _ingestLogItem = ( item ) => {
  return Logs.insert( item );
};

export const handlePreflight = _handlePreflight
export const authenticate    = _authenticateRequest;
export const verify          = _verifyItemContents;
export const respond         = _handleResponse;
export const ingest          = _ingestLogItem;
